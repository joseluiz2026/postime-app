const MESSAGES: Record<string, string> = {
  "Invalid login credentials": "E-mail ou senha incorretos.",
  "Email not confirmed": "Você ainda não confirmou seu e-mail. Verifique sua caixa de entrada (e o spam).",
  "User already registered": "Esse e-mail já tem uma conta. Tente entrar.",
  "Password should be at least 6 characters": "A senha precisa ter pelo menos 6 caracteres.",
};

export function translateAuthError(message: string): string {
  return MESSAGES[message] ?? message;
}
