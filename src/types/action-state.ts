export type FormActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialFormActionState: FormActionState = {
  status: "idle",
  message: ""
};
