import asyncio

import httpx

from a2a.client import A2ACardResolver, ClientConfig, create_client
from a2a.helpers import new_data_part
from a2a.types import Message, Role, SendMessageRequest


async def run_case(label: str, target: str, max_chars: int) -> None:
    async with httpx.AsyncClient() as http:
        card = await A2ACardResolver(http, 'http://127.0.0.1:10002').get_agent_card()
    print(f'CASE={label}')
    print(f'CARD_EXTENSIONS={len(card.capabilities.extensions)}')
    request_data = {
        'intent': 'produce_file',
        'target': target,
        'maxChars': max_chars,
        'conditions': [
            {'field': 'artifact_name', 'operator': 'equals', 'value': 'result.txt'},
            {'field': 'media_type', 'operator': 'equals', 'value': 'text/plain'},
        ],
        'acceptanceCriteria': [
            {'field': 'content', 'operator': 'equals', 'value': target},
            {'field': 'character_count', 'operator': 'lte', 'value': max_chars},
        ],
    }
    message = Message(
        message_id=f'msg-{label}',
        role=Role.ROLE_USER,
        parts=[new_data_part(request_data, media_type='application/json')],
        metadata={'representationNote': 'Unnamespaced application metadata; no A2A extension semantics.'},
    )
    client = await create_client(card, ClientConfig(streaming=True))
    async for event in client.send_message(SendMessageRequest(message=message)):
        print(event)
    await client.close()


async def main() -> None:
    await run_case('accepted', 'OK', 2)
    await run_case('rejected-result', 'TOOLONG', 3)


if __name__ == '__main__':
    asyncio.run(main())
