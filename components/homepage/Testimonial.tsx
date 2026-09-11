import Image from "next/image";
import type { ReactElement } from "react";

export function Testimonial(): ReactElement {
  return (
    <section aria-labelledby="testimonial-heading" className="border-b border-border px-6 py-14 text-center lg:px-24 lg:py-[60px]">
      <h2 id="testimonial-heading" className="text-sm font-medium tracking-[0.08em] text-accent">SUCCESS STORIES</h2>
      <figure className="mt-6">
        <blockquote className="mx-auto max-w-[900px] text-xl leading-[1.4] font-normal tracking-[-0.025em] text-text-dark sm:text-2xl lg:text-[32px]">
          “I used to spend my evenings copy-pasting resumes. Now I open my dashboard to see interviews waiting. It feels like cheating. Had 3 offers on the table simultaneously.”
        </blockquote>
        <figcaption className="mt-6 flex items-center justify-center gap-3 text-left">
          <Image src="/images/testimonial-portrait.png" alt="" width={48} height={48} className="size-12 rounded-md object-cover" />
          <div>
            <p className="text-base font-semibold text-text-slate">Tom Wilson</p>
            <p className="mt-1 text-sm text-text-secondary">Junior Developer</p>
          </div>
        </figcaption>
      </figure>
    </section>
  );
}
