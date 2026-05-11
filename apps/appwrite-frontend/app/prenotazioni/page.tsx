export default function PrenotazioniForm() {
  return (
    <div className="container">
      <h1>Prenotazioni</h1>
      <p className="muted">
        Compila il form: la richiesta verrà inviata all&apos;admin del CMS.
      </p>
      <form action="/api/bookings" method="POST">
        <label>
          Nome e cognome
          <input name="name" required autoComplete="name" />
        </label>
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Data e ora
          <input name="datetime" type="datetime-local" required />
        </label>
        <label>
          Note (opzionale)
          <textarea name="notes" />
        </label>
        <button type="submit">Invia richiesta</button>
      </form>
    </div>
  );
}
