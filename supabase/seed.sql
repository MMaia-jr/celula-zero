insert into public.pilot_invites(email, label)
values ('pilot@celulazero.local', 'Piloto local do Gate 1')
on conflict (email) do nothing;

insert into public.actors(id, kind, name, operator_label) values
  ('00000000-0000-4000-8000-000000000001', 'ORGANIZATION', 'Célula Zero · equipe fundadora', null),
  ('00000000-0000-4000-8000-000000000002', 'SYSTEM', 'Agentes de IA · demonstração', null),
  ('00000000-0000-4000-8000-000000000003', 'SYSTEM', 'Célula Zero · auditoria', null)
on conflict (id) do nothing;

insert into public.projects(
  id, cell_id, slug, title, summary, current_intent, steward_actor_id, stage, visibility,
  economic_regime, intended_result, rules_and_limits, needs, source_label,
  version, created_at, updated_at, published_at
) values
  (
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-00000000c001',
    'celula-zero-solo-fertil',
    'Célula Zero — Solo fértil',
    'Um ambiente operacional para projetos encontrarem colaboradores, condições claras e evidências verificáveis.',
    'Entregar primeiro um corte local e reproduzível: projeto persistente, leitura pública, acesso controlado, timeline e exportação.',
    '00000000-0000-4000-8000-000000000001',
    'ACTIVE', 'PUBLIC', 'VOLUNTARY',
    'Um MVP habitável que permita completar o ciclo de colaboração sem depender de contexto privado.',
    'Sem custódia, captação pública, promessa de renda, reputação universal ou autoridade econômica silenciosa de agentes.',
    array['testes de usabilidade', 'auditoria de autorização', 'design responsivo'],
    'CANONICAL', 2,
    '2026-08-21T12:00:00Z', '2026-08-21T12:10:00Z', '2026-08-21T12:10:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-00000000c001',
    'agentes-com-autoridade-declarada',
    'Agentes com autoridade declarada',
    'Um protocolo operacional para agentes de IA colaborarem com operador, escopo e limitações visíveis.',
    'Testar handoffs reconstruíveis e registros de autoria, operador e autoridade antes de ampliar automações.',
    '00000000-0000-4000-8000-000000000002',
    'OPEN', 'PUBLIC', 'EXCHANGE',
    'Um conjunto mínimo de práticas e testes para colaboração humano–IA atribuível.',
    'Agentes não são contraparte jurídica presumida, não recebem autoridade financeira e não substituem decisão humana.',
    array['revisão adversarial', 'casos de handoff', 'documentação'],
    'DEMO / SYNTHETIC', 2,
    '2026-08-21T13:00:00Z', '2026-08-21T13:20:00Z', '2026-08-21T13:20:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    '00000000-0000-4000-8000-00000000c001',
    'auditoria-de-integridade-material',
    'Auditoria de integridade material',
    'Preservar contraprovas e verificar se o estado material continua reconciliável com sua trajetória.',
    'Transformar a falha em requisitos: mutações atômicas, eventos append-only e verificação independente.',
    '00000000-0000-4000-8000-000000000003',
    'OPEN', 'PUBLIC', 'BOUNTY_EXTERNAL',
    'Uma suíte adversarial que detecte divergência entre estado material e eventos.',
    'Bounty apenas declarado e liquidado externamente. FAIL permanece visível; atividade não vira reputação.',
    array['pgTAP', 'reconciliação independente', 'documentação de ameaça'],
    'DEMO / SYNTHETIC', 2,
    '2026-08-21T14:00:00Z', '2026-08-21T14:30:00Z', '2026-08-21T14:30:00Z'
  )
on conflict (id) do nothing;

insert into public.project_intents(project_id, kind, content, version, accepted_at) values
  (
    '00000000-0000-4000-8000-000000000101', 'ORIGINAL',
    'Construir em 30 dias o MVP habitável da Célula Zero como sistema operacional de incubação e colaboração.',
    1, '2026-08-21T12:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000101', 'INTERPRETATION',
    'Entregar primeiro um corte local e reproduzível: projeto persistente, leitura pública, acesso controlado, timeline e exportação.',
    1, '2026-08-21T12:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000102', 'ORIGINAL',
    'Permitir que uma pessoa conduza projetos com várias IAs sem confundir produção técnica com decisão humana.',
    1, '2026-08-21T13:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000102', 'INTERPRETATION',
    'Testar handoffs reconstruíveis e registros de autoria, operador e autoridade antes de ampliar automações.',
    1, '2026-08-21T13:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000103', 'ORIGINAL',
    'Aprender com o resultado FAIL do AGENT-COUNCIL-MVP-002 sem reescrever retroativamente o experimento.',
    1, '2026-08-21T14:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000000103', 'INTERPRETATION',
    'Transformar a falha em requisitos: mutações atômicas, eventos append-only e verificação independente.',
    1, '2026-08-21T14:00:00Z'
  )
on conflict (project_id, kind, version) do nothing;

insert into public.events(
  id, project_id, event_type, title, description, actor_id, material_version, payload, occurred_at
) values
  (
    '00000000-0000-4000-8000-000000001001', '00000000-0000-4000-8000-000000000101',
    'PROJECT_CREATED', 'Projeto criado',
    'Registro Original e interpretação inicial foram preservados em objetos distintos.',
    '00000000-0000-4000-8000-000000000001', 1, '{"visibility":"PRIVATE"}', '2026-08-21T12:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000001002', '00000000-0000-4000-8000-000000000101',
    'PROJECT_PUBLISHED', 'Projeto aberto',
    'A leitura pública foi habilitada; a escrita permanece restrita ao piloto.',
    '00000000-0000-4000-8000-000000000001', 2, '{"visibility":"PUBLIC"}', '2026-08-21T12:10:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000001003', '00000000-0000-4000-8000-000000000102',
    'PROJECT_CREATED', 'Projeto semeado',
    'Conteúdo sintético marcado para demonstrar uma entrada possível no sistema.',
    '00000000-0000-4000-8000-000000000002', 1, '{"visibility":"PRIVATE"}', '2026-08-21T13:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000001004', '00000000-0000-4000-8000-000000000102',
    'PROJECT_PUBLISHED', 'Condições publicadas',
    'Operador e limites do agente foram tornados visíveis.',
    '00000000-0000-4000-8000-000000000002', 2, '{"visibility":"PUBLIC"}', '2026-08-21T13:20:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000001005', '00000000-0000-4000-8000-000000000103',
    'PROJECT_CREATED', 'Contraprova preservada',
    'O resultado global FAIL foi mantido como entrada de projeto, não convertido em sucesso.',
    '00000000-0000-4000-8000-000000000003', 1, '{"visibility":"PRIVATE"}', '2026-08-21T14:00:00Z'
  ),
  (
    '00000000-0000-4000-8000-000000001006', '00000000-0000-4000-8000-000000000103',
    'PROJECT_PUBLISHED', 'Auditoria aberta',
    'Requisitos de integridade material foram publicados para colaboração.',
    '00000000-0000-4000-8000-000000000003', 2, '{"visibility":"PUBLIC"}', '2026-08-21T14:30:00Z'
  )
on conflict (id) do nothing;
