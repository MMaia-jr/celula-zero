"use client";

import { useActionState } from "react";
import { createProjectAction, initialProjectActionState } from "@/app/projects/new/actions";

function FieldError({ errors }: { errors: string[] | undefined }) {
  if (!errors?.length) return null;
  return <span className="field-error">{errors[0]}</span>;
}

export function ProjectForm() {
  const [state, action, pending] = useActionState(createProjectAction, initialProjectActionState);

  return (
    <form className="project-form" action={action}>
      <fieldset disabled={pending}>
        <legend>Identidade do projeto</legend>
        <div className="field-grid field-grid-two">
          <label>
            <span>Título</span>
            <input name="title" minLength={4} maxLength={100} required />
            <FieldError errors={state.fieldErrors.title} />
          </label>
          <label>
            <span>Estágio inicial</span>
            <select name="stage" defaultValue="OPEN">
              <option value="OPEN">Aberto</option>
              <option value="ACTIVE">Ativo</option>
              <option value="PAUSED">Pausado</option>
            </select>
            <FieldError errors={state.fieldErrors.stage} />
          </label>
        </div>
        <label>
          <span>Resumo público</span>
          <textarea name="summary" rows={3} minLength={20} maxLength={320} required />
          <small>Em uma frase, o que alguém encontra ou pode fazer aqui?</small>
          <FieldError errors={state.fieldErrors.summary} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Intenção e interpretação</legend>
        <div className="field-grid field-grid-two">
          <label>
            <span>Registro Original</span>
            <textarea name="originalIntent" rows={7} minLength={20} maxLength={4000} required />
            <small>Será imutável. Preserve a formulação como ela existe hoje.</small>
            <FieldError errors={state.fieldErrors.originalIntent} />
          </label>
          <label>
            <span>Interpretação atual</span>
            <textarea name="currentIntent" rows={7} minLength={20} maxLength={4000} required />
            <small>Pode evoluir por versões, sem apagar o registro anterior.</small>
            <FieldError errors={state.fieldErrors.currentIntent} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Condições operacionais</legend>
        <label>
          <span>Resultado pretendido</span>
          <textarea name="intendedResult" rows={4} minLength={10} maxLength={1000} required />
          <FieldError errors={state.fieldErrors.intendedResult} />
        </label>
        <label>
          <span>Necessidades atuais</span>
          <input name="needs" placeholder="design, auditoria, pesquisa" minLength={3} maxLength={600} required />
          <small>Separe por vírgulas.</small>
          <FieldError errors={state.fieldErrors.needs} />
        </label>
        <div className="field-grid field-grid-two">
          <label>
            <span>Regime econômico</span>
            <select name="economicRegime" defaultValue="VOLUNTARY">
              <option value="VOLUNTARY">Voluntário</option>
              <option value="EXCHANGE">Troca</option>
              <option value="BOUNTY_EXTERNAL">Bounty externo</option>
              <option value="SPONSORSHIP">Patrocínio declarado</option>
              <option value="INVESTMENT_INTEREST">Interesse não vinculante</option>
            </select>
            <FieldError errors={state.fieldErrors.economicRegime} />
          </label>
          <label>
            <span>Regras e limites</span>
            <textarea name="rulesAndLimits" rows={4} minLength={10} maxLength={2000} required />
            <FieldError errors={state.fieldErrors.rulesAndLimits} />
          </label>
        </div>
      </fieldset>

      <div className="publish-row">
        <label className="checkbox-label">
          <input name="publishNow" type="checkbox" defaultChecked />
          <span><strong>Publicar após criar</strong><small>Visitantes poderão ler o projeto e sua trajetória.</small></span>
        </label>
        <p>Nenhuma condição econômica cria direito ou movimenta fundos.</p>
      </div>

      {state.message ? <p className="form-message form-error" role="alert">{state.message}</p> : null}
      <button className="button button-primary button-large" type="submit" disabled={pending}>
        {pending ? "Criando com transação atômica…" : "Criar projeto"}
      </button>
    </form>
  );
}
