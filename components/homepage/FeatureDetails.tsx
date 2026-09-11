import type { ReactElement } from "react";

type FeatureItem = {
  title: string;
  description: string;
};

type Props = {
  heading: ReactElement;
  headingId: string;
  items: FeatureItem[];
  accent: "search" | "matching";
};

export function FeatureDetails({ heading, headingId, items, accent }: Props): ReactElement {
  return (
    <div className="bg-surface">
      <div className="ml-5 flex min-h-[180px] items-center border-l border-dashed border-border px-5 py-10 sm:ml-12 lg:min-h-[224px]">
        <h2 id={headingId} className="text-[32px] leading-[1.12] font-semibold tracking-[-0.045em] text-text-slate sm:text-[38px] lg:text-[46px]">
          {heading}
        </h2>
      </div>
      <div>
        {items.map((item, index) => (
          <div key={item.title} className="border-t border-border">
            <div className={`ml-5 border-l px-5 py-7 sm:ml-12 lg:flex lg:h-[153px] lg:flex-col lg:justify-center lg:py-3 ${
              accent === "search" && index === 0
                ? "border-accent"
                : accent === "matching" && index === 1
                  ? "border-success"
                  : "border-border"
            }`}>
              <h3 className="text-lg leading-7 font-semibold tracking-[-0.02em] text-text-dark lg:text-xl">{item.title}</h3>
              <p className="mt-2 text-base leading-[1.65] tracking-[-0.02em] text-text-secondary lg:text-lg">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
