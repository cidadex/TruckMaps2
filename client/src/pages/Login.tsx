import { useState, useEffect } from "react";

interface LoginProps {
  onLogin: (token: string, user: { id: string; username: string }) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [hasUsers, setHasUsers] = useState(true);
  const [checkingUsers, setCheckingUsers] = useState(true);

  useEffect(() => {
    fetch("/api/auth/check-users")
      .then((res) => res.json())
      .then((data) => {
        setHasUsers(data.hasUsers);
        if (!data.hasUsers) setIsRegister(true);
      })
      .catch(() => {})
      .finally(() => setCheckingUsers(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Erro na resposta do servidor:", data);
        setError(data.error || "Erro ao autenticar");
        return;
      }

      onLogin(data.token, data.user);
    } catch {
      setError("Erro de conexão com o servidor");
    } finally {
      setLoading(false);
    }
  };

  if (checkingUsers) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/images/logo-atruck.png"
            alt="ATRUCK"
            className="h-20 mb-6 object-contain"
            data-testid="img-logo"
          />
          <h1 className="text-2xl font-bold text-white tracking-wide" data-testid="text-title">
            Sistema de Manutenção
          </h1>
          <p className="text-gray-400 text-sm mt-1">Gestão de Frota Florestal</p>
        </div>

        <div className="bg-[#1a2332] rounded-xl border border-gray-700/50 shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-white mb-6 text-center" data-testid="text-form-title">
            {isRegister ? "Criar Conta Admin" : "Entrar no Sistema"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Usuário
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                required
                data-testid="input-username"
                className="w-full px-4 py-3 bg-[#0f1419] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
                data-testid="input-password"
                className="w-full px-4 py-3 bg-[#0f1419] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3 text-red-400 text-sm" data-testid="text-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid="button-submit"
              className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg"
            >
              {loading ? "Aguarde..." : isRegister ? "Criar Conta" : "Entrar"}
            </button>
          </form>

          {!hasUsers && !isRegister && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setIsRegister(true)}
                data-testid="button-register-toggle"
                className="text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"
              >
                Criar conta
              </button>
            </div>
          )}

          {isRegister && hasUsers && (
            <div className="mt-6 text-center">
              <button
                onClick={() => setIsRegister(false)}
                data-testid="button-login-toggle"
                className="text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"
              >
                Já tenho uma conta
              </button>
            </div>
          )}

          {!hasUsers && isRegister && (
            <p className="mt-4 text-center text-gray-500 text-xs" data-testid="text-first-user-hint">
              Nenhum usuário cadastrado. Crie o primeiro administrador.
            </p>
          )}
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          ATRUCK &mdash; Manutenção de Frotas
        </p>
      </div>
    </div>
  );
}
