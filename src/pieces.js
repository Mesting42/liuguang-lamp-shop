// The stable color keys also identify saved pieces. Animal artwork is a view only.
export const ANIMALS = Object.freeze({
  amber: { species: "cat", name: "猫咪", fur: "#f4c66f", edge: "#90633d", shade: "#db9c4c", cream: "#fff0d0", inner: "#e99b87", ink: "#573c36", cheek: "#e99a87", light: "#f3cf83" },
  jade: { species: "rabbit", name: "兔子", fur: "#b4dbc5", edge: "#4d7d70", shade: "#86b9a5", cream: "#f3f6df", inner: "#eac1b3", ink: "#314e48", cheek: "#e1aaa2", light: "#aedec8" },
  coral: { species: "fox", name: "狐狸", fur: "#ed9e78", edge: "#a5644c", shade: "#db7e5e", cream: "#fff0d6", inner: "#985d53", ink: "#5a3b35", cheek: "#e77d76", light: "#f0af91" },
  azure: { species: "penguin", name: "企鹅", fur: "#9fcadd", edge: "#4f7892", shade: "#7cacc5", cream: "#f3f5e8", inner: "#f4bd68", ink: "#304b60", cheek: "#e7b0a5", light: "#aed9ef" },
  plum: { species: "bear", name: "小熊", fur: "#c3aed7", edge: "#7c6493", shade: "#a58bbd", cream: "#f4e7dc", inner: "#dfbcce", ink: "#4f3c5d", cheek: "#dba7b8", light: "#d2bce3" }
});

export const animalName = (color) => (Object.hasOwn(ANIMALS, color) ? ANIMALS[color] : ANIMALS.amber).name;

function eyes(palette, left, right, y, size = 3.2) {
  return `<g class="animal-eyes" fill="${palette.ink}"><ellipse cx="${left}" cy="${y}" rx="${size}" ry="${size + .8}"/><ellipse cx="${right}" cy="${y}" rx="${size}" ry="${size + .8}"/></g><g fill="#fffaf0"><circle cx="${left - .8}" cy="${y - 1.3}" r="1.1"/><circle cx="${right - .8}" cy="${y - 1.3}" r="1.1"/></g>`;
}

function cheeks(palette, left, right, y) {
  return `<g fill="${palette.cheek}" opacity=".7"><ellipse cx="${left}" cy="${y}" rx="4.7" ry="2.5"/><ellipse cx="${right}" cy="${y}" rx="4.7" ry="2.5"/></g>`;
}

function face(color, p) {
  const outline = `stroke="${p.edge}" stroke-width="2.2"`;
  const mouth = `fill="none" stroke="${p.ink}" stroke-width="1.7"`;
  if (color === "amber") return `
    <path class="animal-outline" d="M13 30 12 13Q12 8 17 11L28 20Q36 18 44 20L55 11Q60 8 60 14L59 31Q66 39 63 49C60 61 49 65 36 65S12 61 9 49Q6 39 13 30Z" fill="${p.fur}" ${outline}/>
    <path d="m16 16 1 12 9-5Zm40 0-10 7 9 5Z" fill="${p.inner}"/>
    <path d="M12 48q4 13 24 13t24-13q-1 16-24 17T12 48" fill="${p.shade}" opacity=".45"/>
    <path d="M25 44c4-3 8-1 11 1 3-2 7-4 11-1 8 6 0 15-11 15S17 50 25 44Z" fill="${p.cream}"/>
    <path d="m30 23 1.5 5M36 22v6m6-5-1.5 5" stroke="${p.shade}" stroke-width="3"/>
    ${eyes(p, 24, 48, 39)}${cheeks(p, 17, 55, 47)}
    <path d="M33 45q3-2 6 0-1 4-3 4t-3-4" fill="${p.ink}"/>
    <path d="M36 49v2m0 0q-4 4-7 0m7 0q4 4 7 0m-24-8-6-1m6 6-6 1m40-6 6-1m-6 6 6 1" ${mouth}/>
    <path d="M19 33q3-3 6-3" stroke="${p.cream}" stroke-width="2.5" opacity=".7"/>`;

  if (color === "jade") return `
    <path class="animal-outline" d="M18 30C12 17 13 4 19 3c7-1 12 13 12 25h10C41 16 44 4 50 5c7 1 8 14 2 27 9 4 13 11 11 19-2 10-13 15-27 15S11 61 9 51c-2-9 1-16 9-21Z" fill="${p.fur}" ${outline}/>
    <path d="M21 28c-4-9-5-17-2-18 3-1 6 7 7 17Zm24 1c0-9 2-17 5-17 3 1 2 10-1 18Z" fill="${p.inner}"/>
    <path d="M12 50q4 12 24 12t24-12q-2 16-24 16T12 50" fill="${p.shade}" opacity=".45"/>
    <ellipse cx="36" cy="51" rx="15" ry="10" fill="${p.cream}"/>
    ${eyes(p, 25, 47, 42, 3)}${cheeks(p, 17, 55, 49)}
    <path d="M33 47q3-2 6 0l-3 4Z" fill="${p.inner}" stroke="${p.edge}" stroke-width="1.1"/>
    <path d="M33 54h6v4q-3 2-6 0Z" fill="#fffaf0"/>
    <path d="M36 51v3m0 0q-4 3-7-1m7 1q4 3 7-1" ${mouth}/>
    <path d="M20 35q3-3 6-3" stroke="${p.cream}" stroke-width="2.5" opacity=".8"/>`;

  if (color === "coral") return `
    <path class="animal-outline" d="M13 29 12 10q0-4 4-2l14 13q6-1 12 0L56 8q4-2 4 2l-1 19 7 10q2 3-2 4l-6 1 4 5q2 3-2 4L45 63q-9 5-18 0L12 53q-4-1-2-4l4-5-6-1q-4-1-2-4Z" fill="${p.fur}" ${outline}/>
    <path d="m17 15 2 15 9-6Zm38 0-11 9 9 6Z" fill="${p.inner}"/>
    <path d="M10 40c10 1 15 6 26 12 11-6 16-11 26-12l-7 10 4 1-16 11q-7 5-14 0L13 51h5Z" fill="${p.cream}"/>
    <path d="M32 25q4-2 8 0l-4 8Z" fill="${p.cream}" opacity=".65"/>
    ${eyes(p, 24, 48, 38, 3.1)}${cheeks(p, 16, 56, 45)}
    <path d="M32 47q4-2 8 0-1 5-4 5t-4-5" fill="${p.ink}"/>
    <path d="M36 52v2m0 0q-4 3-7-1m7 1q4 3 7-1" ${mouth}/>
    <path d="M18 33q3-3 6-3" stroke="${p.cream}" stroke-width="2.5" opacity=".8"/>`;

  if (color === "azure") return `
    <path class="animal-outline" d="M11 45C9 28 17 14 29 12q-2-3-1-5 6 0 9 5C52 9 63 24 62 43q6 8 2 13-1 2-6 1C53 64 45 67 36 67S18 64 13 57q-5 1-6-1-4-4 4-11Z" fill="${p.fur}" ${outline}/>
    <path d="M14 45q2 17 22 18 20-1 22-18l2 10q-8 12-24 12T12 55Z" fill="${p.shade}" opacity=".45"/>
    <path d="M17 38c0-11 12-18 19-8 7-10 19-3 19 8 0 15-6 23-19 23S17 53 17 38Z" fill="${p.cream}"/>
    ${eyes(p, 26, 46, 40, 3.1)}${cheeks(p, 20, 52, 48)}
    <path d="M30 48q6-5 12 0l-6 6Z" fill="${p.inner}" stroke="${p.edge}" stroke-width="1.1"/>
    <path d="M32 55q4 3 8 0" ${mouth}/>
    <path d="M17 27q4-5 8-6" stroke="${p.cream}" stroke-width="2.5" opacity=".6"/>`;

  return `
    <g ${outline}><circle cx="17" cy="20" r="11" fill="${p.fur}"/><circle cx="55" cy="20" r="11" fill="${p.fur}"/></g>
    <g fill="${p.inner}"><circle cx="17" cy="20" r="6"/><circle cx="55" cy="20" r="6"/></g>
    <path class="animal-outline" d="M11 39c0-16 11-22 25-22s25 6 25 22v7c0 13-10 20-25 20S11 59 11 46Z" fill="${p.fur}" ${outline}/>
    <path d="M13 48q4 13 23 13t23-13q-2 18-23 18T13 48" fill="${p.shade}" opacity=".45"/>
    <ellipse cx="36" cy="50" rx="14" ry="11" fill="${p.cream}"/>
    <path d="m31 23 3 2 2-3 3 3 3-2" fill="none" stroke="${p.shade}" stroke-width="2.3"/>
    ${eyes(p, 24, 48, 39, 3)}${cheeks(p, 17, 55, 47)}
    <path d="M31 46q5-4 10 0 0 5-5 5t-5-5" fill="${p.ink}"/>
    <path d="M36 51v3m0 0q-4 3-7-1m7 1q4 3 7-1" ${mouth}/>
    <path d="M18 33q3-4 7-4" stroke="${p.cream}" stroke-width="2.5" opacity=".7"/>`;
}

function specialMark(special, direction) {
  if (special === "beam") {
    const vertical = direction === "v";
    return `<g class="animal-special animal-beam-${vertical ? "v" : "h"}" fill="#fff0bb" stroke="#a9763f" stroke-width="1.5"><rect x="${vertical ? 57 : 14}" y="${vertical ? 31 : 57}" width="${vertical ? 12 : 44}" height="${vertical ? 35 : 12}" rx="5"/><path d="${vertical ? "M63 36v25m-3-21 3-4 3 4m-6 17 3 4 3-4" : "M20 63h32m-28-3-4 3 4 3m24-6 4 3-4 3"}" fill="none" stroke="#896036" stroke-width="2"/></g>`;
  }
  if (special === "bomb") return '<g class="animal-special animal-bomb"><circle cx="57" cy="58" r="12" fill="#ffe3a1" stroke="#a9763f" stroke-width="1.6"/><path d="m57 49 2.7 5.7 6.3.8-4.6 4.4 1.1 6.1-5.5-3-5.5 3 1.1-6.1-4.6-4.4 6.3-.8Z" fill="#b17b3e" stroke="#fff7dc" stroke-width="1"/></g>';
  if (special === "lens") return '<g class="animal-special animal-lens"><path d="m57 44 13 14-13 13-13-13Z" fill="#f5e9d5" stroke="#8b748d" stroke-width="1.6"/><path d="m57 46 11 12H57Z" fill="#b8dce3"/><path d="M68 58 57 69V58Z" fill="#dbc0df"/><path d="M57 69 46 58h11Z" fill="#f3c0a8"/><path d="m46 58 11-12v12Z" fill="#f2d58e"/><path d="m57 50 2.2 5.8 5.8 2.2-5.8 2.2L57 66l-2.2-5.8L49 58l5.8-2.2Z" fill="#fffaf0" stroke="#8b748d" stroke-width="1.2"/></g>';
  return "";
}

export function pieceArt(color, special, direction = "h") {
  const key = Object.hasOwn(ANIMALS, color) ? color : "amber";
  const p = ANIMALS[key];
  const kind = ["beam", "bomb", "lens"].includes(special) ? special : null;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="piece animal-piece piece-${key}${kind ? " special-" + kind : ""}" data-animal="${p.species}" viewBox="0 0 72 72" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${face(key, p)}${specialMark(kind, direction)}</svg>`;
}
