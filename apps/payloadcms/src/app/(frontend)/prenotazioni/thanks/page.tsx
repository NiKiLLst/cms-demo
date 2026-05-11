import Link from 'next/link'

export default function PrenotazioniThanks() {
  return (
    <div className="container">
      <h1>Grazie!</h1>
      <p>La tua richiesta è stata registrata. Ti contatteremo a breve.</p>
      <p><Link href="/">← Home</Link></p>
    </div>
  )
}
