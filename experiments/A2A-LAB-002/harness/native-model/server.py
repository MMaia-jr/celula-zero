import uvicorn

from google.protobuf.json_format import MessageToDict

from a2a.helpers import new_data_part, new_task_from_user_message, new_text_message, new_text_part
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.routes import create_agent_card_routes, create_jsonrpc_routes
from a2a.server.tasks import InMemoryTaskStore, TaskUpdater
from a2a.types import AgentCapabilities, AgentCard, AgentInterface, AgentSkill, TaskState
from starlette.applications import Starlette


class NativeModelExecutor(AgentExecutor):
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        task = context.current_task or new_task_from_user_message(context.message)
        if not context.current_task:
            await event_queue.enqueue_event(task)

        updater = TaskUpdater(event_queue, task.id, task.context_id)
        await updater.update_status(
            TaskState.TASK_STATE_WORKING,
            new_text_message('Request acknowledged; executing. This is application text, not a protocol commitment.'),
        )

        request = MessageToDict(context.message.parts[0].data)
        target = request['target']
        max_chars = int(request['maxChars'])
        produced = target

        await updater.add_artifact(
            parts=[new_text_part(produced, media_type='text/plain')],
            name='result.txt',
            metadata={
                'applicationRole': 'candidate-output',
                'claimedConditions': request['conditions'],
            },
        )

        checks = [
            {'criterion': 'content_equals_target', 'passed': produced == target},
            {'criterion': 'length_lte_max_chars', 'passed': len(produced) <= max_chars},
        ]
        decision = 'ACCEPTED' if all(item['passed'] for item in checks) else 'REJECTED'

        await updater.add_artifact(
            parts=[new_data_part({'decision': decision, 'checks': checks}, media_type='application/json')],
            name='application-verification.json',
            metadata={'applicationDecision': decision},
        )
        await updater.update_status(
            TaskState.TASK_STATE_COMPLETED,
            new_text_message(
                f'Execution completed; application-level result decision: {decision}. '
                'TASK_STATE_COMPLETED does not encode that decision.'
            ),
            metadata={'applicationDecision': decision},
        )

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        raise NotImplementedError('Cancel is not supported.')


skill = AgentSkill(
    id='produce_constrained_text',
    name='Produce constrained text',
    description='Produces text and applies application-defined acceptance checks.',
    input_modes=['application/json'],
    output_modes=['text/plain', 'application/json'],
    tags=['native-a2a', 'acceptance-experiment'],
)
card = AgentCard(
    name='Native A2A Semantics Probe',
    description='Uses only core A2A primitives; no extension is declared.',
    version='0.0.1',
    default_input_modes=['application/json'],
    default_output_modes=['text/plain', 'application/json'],
    capabilities=AgentCapabilities(streaming=True),
    supported_interfaces=[AgentInterface(protocol_binding='JSONRPC', url='http://127.0.0.1:10002', protocol_version='1.0')],
    skills=[skill],
)
handler = DefaultRequestHandler(
    agent_executor=NativeModelExecutor(),
    task_store=InMemoryTaskStore(),
    agent_card=card,
)
routes = [*create_agent_card_routes(card), *create_jsonrpc_routes(handler, '/')]
app = Starlette(routes=routes)

if __name__ == '__main__':
    uvicorn.run(app, host='127.0.0.1', port=10002)
