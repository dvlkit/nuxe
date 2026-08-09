export function useAuth() {
  const user = useState<{name: string} | null>('auth-user', () => null)

  function login(name: string) {
    user.value = { name }
  }

  function logout() {
    user.value = null
  }

  return {
    user,
    login,
    logout
  }
}