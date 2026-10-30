// O endereço não aparece inteiro em nenhum lugar do código: é montado no navegador.
// Como o site é renderizado pelo JavaScript, ele também não existe no HTML entregue,
// o que dificulta a coleta por robôs de spam (CLAUDE.md, seção 8.4).
const PARTS = ['romulorego16', 'gmail.com']

export function ContactEmail({ className = '' }: { className?: string }) {
  const address = PARTS.join('@')
  return (
    <a
      href={`mailto:${address}`}
      className={`text-brand-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-brand ${className}`}
    >
      {address}
    </a>
  )
}
