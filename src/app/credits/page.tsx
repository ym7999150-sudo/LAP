"use client";
import { ExternalLink } from "lucide-react";
import { Page } from "@/components/ui/Page";
import { ASSETS } from "@/components/lab/AssetModel";
import { useI18n } from "@/lib/i18n/client";

/** Attribution for every third-party 3D model (required by CC-BY, courteous for CC0). */
export default function Credits() {
  const { L } = useI18n();
  return (
    <Page
      title={L({ en: "3D model credits", ar: "حقوق النماذج ثلاثية الأبعاد" })}
      subtitle={L({
        en: "Real-world models are used only where a genuinely matching, properly licensed model exists. Everything else is modelled in code by LabVerse. Sound effects are synthesised in code.",
        ar: "تُستخدم النماذج الحقيقية فقط عند وجود نموذج مطابق فعلاً ومرخّص بشكل صحيح. كل ما عدا ذلك مرسوم بالكود داخل LabVerse. المؤثرات الصوتية مولّدة بالكود.",
      })}
    >
      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-faint">
            <tr className="border-b border-line">
              <th className="p-3 text-start">{L({ en: "Model", ar: "النموذج" })}</th>
              <th className="p-3 text-start">{L({ en: "Author", ar: "المؤلف" })}</th>
              <th className="p-3 text-start">{L({ en: "Licence", ar: "الترخيص" })}</th>
              <th className="p-3 text-start">{L({ en: "Used for", ar: "يُستخدم لـ" })}</th>
              <th className="p-3 text-start">{L({ en: "Source", ar: "المصدر" })}</th>
            </tr>
          </thead>
          <tbody>
            {ASSETS.map((a) => (
              <tr key={a.id} className="border-b border-line/60">
                <td className="p-3 font-medium">{a.name}</td>
                <td className="p-3">{a.author}</td>
                <td className="p-3">
                  <a className="text-accent" href={a.license.startsWith("CC-BY") ? "https://creativecommons.org/licenses/by/3.0/" : "https://creativecommons.org/publicdomain/zero/1.0/"} target="_blank" rel="noopener noreferrer">
                    {a.license}
                  </a>
                </td>
                <td className="p-3 text-muted">{a.intendedUse}</td>
                <td className="p-3">
                  <a className="inline-flex items-center gap-1 text-accent" href={a.source} target="_blank" rel="noopener noreferrer">
                    {new URL(a.source).hostname} <ExternalLink size={12} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-faint">
        Poly Haven models are CC0 (public domain). Poly Pizza models marked CC-BY 3.0 are used under attribution; models credited to “Poly by Google” come from Google’s Poly collection preserved by Poly Pizza.
      </p>
    </Page>
  );
}
