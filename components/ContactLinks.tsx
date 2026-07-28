'use client'

// Rende email/cellulare come link mailto:/tel:, utili soprattutto su mobile
// per contattare subito la persona senza copiare il testo. stopPropagation
// perche' la cella e' dentro una riga cliccabile (accordion ExpandableRow).
export function ContactLinks({
  email,
  phone,
}: {
  email?: string | null
  phone?: string | null
}) {
  if (!email && !phone) return <>—</>

  return (
    <span onClick={(e) => e.stopPropagation()}>
      {email && (
        <a href={`mailto:${email}`} className="contact-link">
          {email}
        </a>
      )}
      {email && phone && <br />}
      {phone && (
        <a href={`tel:${phone}`} className="contact-link muted">
          {phone}
        </a>
      )}
    </span>
  )
}
