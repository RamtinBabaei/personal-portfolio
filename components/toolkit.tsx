"use client";
import { useRef, useState } from "react";
import { t } from "@/lib/copy";
import type { Locale } from "@/lib/domain";
const tools = [
  ["HTML", "CSS", "JavaScript", "React"],
  ["Node.js", "Express", "REST APIs", "SQL"],
  ["Git", "GitHub", "Responsive design", "Deployment"],
];
export function Toolkit({ locale }: { locale: Locale }) {
  const text = t(locale);
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div className="toolkit-widget">
      <div className="tabs" role="tablist" aria-label={text.toolkit}>
        {text.toolkitTabs.map((tab, i) => (
          <button
            key={tab}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            id={`tool-tab-${i}`}
            type="button"
            role="tab"
            aria-selected={active === i}
            aria-controls={`tool-panel-${i}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(event) => {
              const dir = locale === "fa" ? -1 : 1;
              let next = active;
              if (event.key === "ArrowRight") next = (active + dir + 3) % 3;
              else if (event.key === "ArrowLeft") next = (active - dir + 3) % 3;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = 2;
              else return;
              event.preventDefault();
              setActive(next);
              tabs.current[next]?.focus();
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      {text.toolkitTabs.map((_, i) => (
        <div
          key={i}
          id={`tool-panel-${i}`}
          role="tabpanel"
          aria-labelledby={`tool-tab-${i}`}
          hidden={active !== i}
          tabIndex={0}
        >
          <p>{text.toolkitDescriptions[i]}</p>
          <div className="tool-tags" dir="ltr">
            {tools[i].map((tool, j) => (
              <span key={tool}>
                <small>0{j + 1}</small>
                {tool}
                <span aria-hidden="true">↗</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
