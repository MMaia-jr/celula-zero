"use client";

import { useActionState } from "react";
import { createProjectAction } from "@/app/projects/new/actions";
import { initialProjectActionState } from "@/app/projects/new/state";
import type { Locale } from "@/lib/i18n/core";

function FieldError({ errors }: { errors: string[] | undefined }) {
  if (!errors?.length) return null;
  return <span className="field-error">{errors[0]}</span>;
}

export function ProjectForm({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const [state, action, pending] = useActionState(createProjectAction, initialProjectActionState);

  return (
    <form className="project-form" action={action}>
      <input type="hidden" name="locale" value={locale} />

      <fieldset disabled={pending}>
        <legend>{en ? "Project identity" : "Identidade do projeto"}</legend>
        <div className="field-grid field-grid-two">
          <label>
            <span>{en ? "Title" : "Título"}</span>
            <input name="title" minLength={4} maxLength={100} required />
            <FieldError errors={state.fieldErrors.title} />
          </label>
          <label>
            <span>{en ? "Initial stage" : "Estágio inicial"}</span>
            <select name="stage" defaultValue="OPEN">
              <option value="OPEN">{en ? "Open" : "Aberto"}</option>
              <option value="ACTIVE">{en ? "Active" : "Ativo"}</option>
              <option value="PAUSED">{en ? "Paused" : "Pausado"}</option>
            </select>
            <FieldError errors={state.fieldErrors.stage} />
          </label>
        </div>

        <label>
          <span>{en ? "Public summary" : "Resumo público"}</span>
          <textarea name="summary" rows={3} minLength={20} maxLength={320} required />
          <small>
            {en
              ? "In one sentence, what can someone find or do here?"
              : "Em uma frase, o que alguém encontra ou pode fazer aqui?"}
          </small>
          <FieldError errors={state.fieldErrors.summary} />
        </label>
      </fieldset>

      <fieldset>
        <legend>{en ? "Intent and interpretation" : "Intenção e interpretação"}</legend>
        <div className="field-grid field-grid-two">
          <label>
            <span>{en ? "Original Record" : "Registro Original"}</span>
            <textarea name="originalIntent" rows={7} minLength={20} maxLength={4000} required />
            <small>
              {en
                ? "It will be immutable. Preserve the wording as it exists now."
                : "Será imutável. Preserve a formulação como ela existe hoje."}
            </small>
            <FieldError errors={state.fieldErrors.originalIntent} />
          </label>
          <label>
            <span>{en ? "Current interpretation" : "Interpretação atual"}</span>
            <textarea name="currentIntent" rows={7} minLength={20} maxLength={4000} required />
            <small>
              {en
                ? "It may evolve by versions without erasing the previous record."
                : "Pode evoluir por versões, sem apagar o registro anterior."}
            </small>
            <FieldError errors={state.fieldErrors.currentIntent} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>{en ? "Operating conditions" : "Condições operacionais"}</legend>
        <label>
          <span>{en ? "Intended result" : "Resultado pretendido"}</span>
          <textarea name="intendedResult" rows={4} minLength={10} maxLength={1000} required />
          <FieldError errors={state.fieldErrors.intendedResult} />
        </label>

        <label>
          <span>{en ? "Current needs" : "Necessidades atuais"}</span>
          <textarea
            name="needs"
            rows={3}
            placeholder={en ? "design\nresearch\naudit" : "design\npesquisa\nauditoria"}
            minLength={3}
            maxLength={600}
            required
          />
          <small>
            {en
              ? "Use one need per line or separate items with commas."
              : "Use uma necessidade por linha ou separe os itens por vírgulas."}
          </small>
          <FieldError errors={state.fieldErrors.needs} />
        </label>

        <div className="field-grid field-grid-two">
          <label>
            <span>{en ? "Economic regime" : "Regime econômico"}</span>
            <select name="economicRegime" defaultValue="VOLUNTARY">
              <option value="VOLUNTARY">{en ? "Voluntary" : "Voluntário"}</option>
              <option value="EXCHANGE">{en ? "Exchange" : "Troca"}</option>
              <option value="BOUNTY_EXTERNAL">{en ? "External bounty" : "Bounty externo"}</option>
              <option value="SPONSORSHIP">{en ? "Declared sponsorship" : "Patrocínio declarado"}</option>
              <option value="INVESTMENT_INTEREST">
                {en ? "Non-binding investment interest" : "Interesse não vinculante"}
              </option>
            </select>
            <FieldError errors={state.fieldErrors.economicRegime} />
          </label>

          <label>
            <span>{en ? "Rules and limits" : "Regras e limites"}</span>
            <textarea name="rulesAndLimits" rows={4} minLength={10} maxLength={2000} required />
            <FieldError errors={state.fieldErrors.rulesAndLimits} />
          </label>
        </div>
      </fieldset>

      <div className="publish-row">
        <label className="checkbox-label">
          <input name="publishNow" type="checkbox" defaultChecked />
          <span>
            <strong>{en ? "Publish after creation" : "Publicar após criar"}</strong>
            <small>
              {en
                ? "Visitors will be able to read the project and its trajectory."
                : "Visitantes poderão ler o projeto e sua trajetória."}
            </small>
          </span>
        </label>
        <p>
          {en
            ? "No economic condition creates a right or moves funds."
            : "Nenhuma condição econômica cria direito ou movimenta fundos."}
        </p>
      </div>

      {state.message ? (
        <p className="form-message form-error" role="alert">{state.message}</p>
      ) : null}

      <button className="button button-primary button-large" type="submit" disabled={pending}>
        {pending
          ? en ? "Creating atomically…" : "Criando com transação atômica…"
          : en ? "Create project" : "Criar projeto"}
      </button>
    </form>
  );
}
