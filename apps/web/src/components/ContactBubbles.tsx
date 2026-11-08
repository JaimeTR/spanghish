import { CONTACT } from "@/lib/site";
import { Bubble } from "./Bubble";

/**
 * Teléfono y email como dos bocadillos grandes (cola a un lado y al otro).
 * Son los enlaces reales de contacto: tel: y mailto:.
 */
export function ContactBubbles({ phoneLabel, emailLabel }: { phoneLabel: string; emailLabel: string }) {
  return (
    <>
      <Bubble tone="cream" tail="left" shadow className="lg:mr-14">
        <a
          href={`tel:${CONTACT.phoneE164}`}
          className="group flex flex-col gap-1 rounded-[1.75rem] px-6 py-6 text-ink no-underline [--focus-color:var(--brand-purple)] sm:px-8"
        >
          <span className="font-semibold text-ink-muted">{phoneLabel}</span>
          <span className="font-display text-[clamp(2.1rem,7vw,3.5rem)] leading-none text-brand-purple decoration-[3px] group-hover:underline">
            {CONTACT.phoneDisplay}
          </span>
        </a>
      </Bubble>
      <Bubble tone="yellow" tail="right" shadow className="lg:ml-14">
        <a
          href={`mailto:${CONTACT.email}`}
          className="group flex flex-col gap-1 rounded-[1.75rem] px-6 py-6 text-ink no-underline [--focus-color:var(--brand-purple)] sm:px-8"
        >
          <span className="font-semibold text-ink/75">{emailLabel}</span>
          <span className="font-display text-[clamp(1.45rem,5.6vw,2.6rem)] leading-none [overflow-wrap:anywhere] text-brand-burgundy decoration-[3px] group-hover:underline">
            {CONTACT.email}
          </span>
        </a>
      </Bubble>
    </>
  );
}
