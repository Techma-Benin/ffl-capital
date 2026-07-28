import { toast } from "sonner";

type NotifyOptions = {
  title?: string;
  description?: string;
};

function show(
  type: "success" | "error",
  message: string,
  options?: NotifyOptions,
) {
  const { title, description } = options ?? {};
  const props = {
    description: description ?? (title ? message : undefined),
    duration: 4500,
  };
  const content = title ?? message;

  if (type === "success") {
    toast.success(content, props);
  } else {
    toast.error(content, props);
  }
}

export const notify = {
  success: (message: string, options?: NotifyOptions) =>
    show("success", message, options),
  error: (message: string, options?: NotifyOptions) =>
    show("error", message, options),
};
