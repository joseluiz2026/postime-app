-- 5 new automated message templates, closing the gaps found auditing the
-- customer lifecycle (see project memory): the free-mode-ending transition
-- had no warning (only trial-ending did), and the whole payment lifecycle
-- (activated/late/canceled) plus unmatched-payment reconciliation had no
-- customer-facing email at all — only an internal owner alert.
insert into public.message_templates (key, subject, body) values
  ('free_ending', 'Seu acesso grátis no POSTime está acabando',
   'Faltam poucos dias para o seu modo grátis limitado encerrar de vez. Assine o Pro para continuar gerando conteúdo sem interrupção.'),
  ('subscription_activated', 'Assinatura Pro ativada!',
   'Sua assinatura foi confirmada — agora você gera conteúdo sem limite, todos os dias. Bem-vindo ao Pro.'),
  ('subscription_late', 'Não conseguimos confirmar seu pagamento',
   'Houve um problema para processar o pagamento da sua assinatura Pro. Atualize seus dados de pagamento na Kiwify para não perder o acesso.'),
  ('subscription_canceled', 'Sua assinatura Pro foi encerrada',
   'Seu acesso Pro foi cancelado. Você pode assinar novamente quando quiser, direto no POSTime.'),
  ('payment_unmatched', 'Recebemos seu pagamento, mas precisamos confirmar sua conta',
   'Identificamos um pagamento aprovado com este e-mail, mas não encontramos uma conta POSTime correspondente. Acesse o POSTime, abra o aviso de assinatura e clique em "Já paguei mas minha conta não foi liberada", informando este mesmo e-mail.')
on conflict (key) do nothing;

-- profiles: dedup guard for the new free-mode-ending email (same pattern as
-- the existing trial_ending_sent).
alter table public.profiles
  add column if not exists free_ending_sent boolean not null default false;
