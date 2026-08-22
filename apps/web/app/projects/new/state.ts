export interface ProjectActionState {
  status: "IDLE" | "ERROR";
  message: string;
  fieldErrors: Record<string, string[]>;
}

export const initialProjectActionState: ProjectActionState = {
  status: "IDLE",
  message: "",
  fieldErrors: {},
};
