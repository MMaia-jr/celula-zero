export interface LoginActionState {
  status: "IDLE" | "ERROR" | "SENT";
  message: string;
}

export const initialLoginState: LoginActionState = { status: "IDLE", message: "" };
