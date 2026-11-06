// 6.9 Compare (#compare). Paper-deep. Real table; scrolls horizontally on mobile with the
// first column sticky.
import { compare } from "@/content/site";
import { Section, SectionHeader } from "./Section";

export function Compare() {
  const [, agency, inHouse, promiseLoop] = compare.columns;
  const sticky =
    "sticky left-0 z-10 bg-surface after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-line";
  return (
    <Section id={compare.anchor} bg="paper-deep" labelledBy="compare-title">
      <SectionHeader id="compare-title" eyebrow={compare.eyebrow} title={compare.h2} />
      <div
        role="region"
        aria-labelledby="compare-title"
        tabIndex={0}
        className="mt-12 overflow-x-auto rounded-xl border border-line bg-surface focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
      >
        <table className="w-full min-w-[720px] border-collapse text-left text-sm text-ink md:text-base">
          <caption className="sr-only">{compare.caption}</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className={`${sticky} w-[30%] px-4 py-4 md:px-6`}>
                <span className="sr-only">{compare.firstColumnLabel}</span>
              </th>
              <th scope="col" className="px-4 py-4 font-semibold md:px-6">
                {agency}
              </th>
              <th scope="col" className="px-4 py-4 font-semibold md:px-6">
                {inHouse}
              </th>
              <th scope="col" className="border-l border-line bg-mint-tint px-4 py-4 font-semibold text-brand md:px-6">
                {promiseLoop}
              </th>
            </tr>
          </thead>
          <tbody>
            {compare.rows.map((r, i) => (
              <tr key={r.label} className={i < compare.rows.length - 1 ? "border-b border-line" : ""}>
                <th
                  scope="row"
                  className={`${sticky} px-4 py-4 align-top font-medium md:px-6`}
                >
                  {r.label}
                </th>
                <td className="px-4 py-4 align-top md:px-6">{r.agency}</td>
                <td className="px-4 py-4 align-top md:px-6">{r.inHouse}</td>
                <td className="border-l border-line bg-mint-tint/50 px-4 py-4 align-top font-semibold md:px-6">
                  {r.promiseLoop}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
