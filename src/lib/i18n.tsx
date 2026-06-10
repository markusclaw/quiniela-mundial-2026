"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

export type Locale = "es" | "en";

const STORE_KEY = "quiniela-mundial-2026:locale";

type Dict = Record<string, string>;

const EN: Dict = {
  // brand / common
  "brand.tagline": "Presented by Los Reyes Tires",
  "brand.event": "FIFA World Cup 2026",
  "brand.kicker": "Los Reyes Tires",
  "nav.home": "Home",
  "nav.table": "Table",
  "nav.fixtures": "Fixtures",
  "nav.packs": "Packs",
  "nav.admin": "Admin",
  "action.logout": "Log out",
  "common.confirm": "Confirm",
  "common.cancel": "Cancel",
  "common.change": "Change",
  "common.edit": "Edit",
  "common.save": "Save",
  "common.pot": "Pot {n}",

  // landing
  "landing.badge": "Private pool · 48 teams",
  "landing.title": "World Cup 2026\nQuiniela.",
  "landing.subtitle":
    "Pick a team package, follow them through every round, and win as they advance. No more one-winner-takes-all — everyone stays in the game.",
  "landing.feature1": "Built for ~12 friends & family",
  "landing.feature2": "Payouts every phase",
  "landing.tab.join": "Join the pool",
  "landing.tab.login": "I'm already in",
  "landing.name": "Your name",
  "landing.name.ph": "e.g. Don Xaviloneo",
  "landing.pin": "4-digit PIN",
  "landing.pin.help":
    "Pick something easy to remember — it's how you log back in.",
  "landing.code": "Join code",
  "landing.code.ph": "Ask the organizer",
  "landing.modpin": "Organizer PIN",
  "landing.modpin.ph": "Default 0000",
  "landing.btn.join": "Join & pick my package",
  "landing.btn.mod": "Open organizer panel",
  "landing.btn.login": "Log in",
  "landing.toMod": "Organizer? Log in",
  "landing.backPlayer": "← Back to player login",
  "landing.demo": "Load demo pool",
  "landing.footnote":
    "Not tech-savvy friends? The organizer can add anyone and pick packages on their behalf from the Admin panel.",
  "err.nameAndPin": "Enter your name and a 4-digit PIN.",
  "err.code": "That join code doesn't match.",
  "err.nameTaken": "That name is taken — try logging in instead.",
  "err.noMatch": "No match for that name + PIN.",
  "err.modPin": "Wrong organizer PIN.",

  // draw
  "draw.title": "Choose your package",
  "draw.desc1":
    "Every package has one team from each seeding pot — a headliner plus support. Premium packs cost more (better odds), but ",
  "draw.descBold": "pot shares are equal weight",
  "draw.desc2":
    ". A cheap underdog pack that runs deep pays the same as a favorite.",
  "draw.underdogBonus": "1.5× knockout bonus",
  "draw.buyIn": "buy-in",
  "draw.yourPackage": "Your package",
  "draw.takenBy": "Taken by {name}",
  "draw.choose": "Choose this pack",
  "tier.premium": "Premium",
  "tier.mid": "Contender",
  "tier.value": "Underdog",
  "tier.premium.blurb": "Built around a title favorite. Higher buy-in, better odds.",
  "tier.mid.blurb": "A solid headliner with balanced support. The sweet spot.",
  "tier.value.blurb":
    "No favorites — all upside. Cheapest buy-in, biggest payout multiplier.",

  // dashboard
  "dash.noPackage": "You haven't chosen a package yet.",
  "dash.pickMy": "Pick my package",
  "dash.rank": "Your rank",
  "dash.of": "of {n}",
  "dash.totalPoints": "Total points",
  "dash.teamsPicks": "{teams} teams · {picks} picks",
  "dash.potShare": "Pot share",
  "dash.owedSoFar": "owed so far",
  "dash.grpKo": "{grp} grp · {ko} ko",
  "dash.underdog": "1.5× underdog",
  "dash.bonusPicks": "Your bonus picks",
  "dash.bonusDesc":
    "Independent of your teams — a way to climb even if your packs flop.",
  "dash.champion": "Champion (+{n} pts)",
  "dash.pickTeam": "— pick a team —",
  "dash.goldenBoot": "Golden Boot — top scorer (+{n} pts)",
  "dash.scorer.ph": "e.g. Mbappé",
  "dash.darkHorse": "Dark horse — reaches the quarters (+{n} pts)",
  "dash.pick.champion": "Champion",
  "dash.pick.scorer": "Top scorer",
  "dash.pick.darkhorse": "Dark horse",

  // leaderboard
  "lb.title": "Leaderboard",
  "lb.playersPot": "{n} players · pot {pot}",
  "lb.you": "you",
  "lb.organizer": "organizer",
  "lb.pts": "pts",
  "lb.empty": "No players have picked packages yet.",

  // fixtures
  "fx.title": "Groups & fixtures",
  "fx.tab.groups": "groups",
  "fx.tab.schedule": "schedule",
  "fx.group": "Group {g}",
  "fx.matchups": "Matchups",
  "fx.groupStage": "Group stage · {window}",
  "fx.advanceNote":
    "48 teams · 12 groups · the top 2 of each group plus the 8 best third-place teams advance to the Round of 32.",

  // stages
  "stage.group": "Group stage",
  "stage.r32": "Round of 32",
  "stage.r16": "Round of 16",
  "stage.qf": "Quarter-final",
  "stage.sf": "Semi-final",
  "stage.final": "Final",
  "stage.champion": "Champion 🏆",
  "stage.eliminated": "Eliminated",
  "stageOpt.group": "In group stage",
  "stageOpt.eliminated": "Eliminated (group)",
  "ko.r32": "Round of 32",
  "ko.r16": "Round of 16",
  "ko.qf": "Quarter-finals",
  "ko.sf": "Semi-finals",
  "ko.final": "Final",

  // admin
  "admin.title": "Organizer panel",
  "admin.tab.results": "Results",
  "admin.tab.people": "People",
  "admin.tab.answers": "Answers",
  "admin.tab.settings": "Settings",
  "admin.results.desc":
    "Enter results as the tournament unfolds. Group W-D-L drives group points; the stage dropdown drives knockout payouts. The leaderboard updates live.",
  "admin.people.add": "Add someone",
  "admin.people.name": "Name",
  "admin.people.namePh": "e.g. Tío Beto",
  "admin.people.pin": "PIN",
  "admin.people.addBtn": "Add",
  "admin.people.players": "Players ({n})",
  "admin.people.noPackage": "— no package —",
  "admin.people.taken": " (taken)",
  "admin.answers.title": "Final answers (for bonus picks)",
  "admin.answers.desc":
    "Set these once known to grade everyone's bonus picks. Dark-horse picks grade automatically from the Results tab.",
  "admin.answers.champion": "Champion",
  "admin.answers.notDecided": "— not decided —",
  "admin.answers.scorer": "Golden Boot (top scorer)",
  "admin.answers.scorerPh": "Player name",
  "admin.answers.save": "Save answers",
  "admin.settings.pool": "Pool settings",
  "admin.settings.name": "Pool name",
  "admin.settings.currency": "Currency",
  "admin.settings.joinCode": "Join code",
  "admin.settings.copied": "Copied — share it with the group.",
  "admin.settings.buyIns": "Buy-ins by tier",
  "admin.settings.apply": "Apply prices to packages",
  "admin.settings.applyNote":
    "Rebuilds the 12 packages with the current prices. Do this before people start choosing.",
  "admin.settings.danger": "Danger zone",
  "admin.settings.loadDemo": "Load demo pool",
  "admin.settings.reset": "Reset pool",
  "admin.settings.resetConfirm":
    "Reset everything? This clears all players and results.",
};

const ES: Dict = {
  "brand.tagline": "Presentado por Los Reyes Tires",
  "brand.event": "Copa Mundial FIFA 2026",
  "brand.kicker": "Los Reyes Tires",
  "nav.home": "Inicio",
  "nav.table": "Tabla",
  "nav.fixtures": "Partidos",
  "nav.packs": "Paquetes",
  "nav.admin": "Admin",
  "action.logout": "Salir",
  "common.confirm": "Confirmar",
  "common.cancel": "Cancelar",
  "common.change": "Cambiar",
  "common.edit": "Editar",
  "common.save": "Guardar",
  "common.pot": "Bombo {n}",

  "landing.badge": "Quiniela privada · 48 equipos",
  "landing.title": "Quiniela\nMundial 2026.",
  "landing.subtitle":
    "Elige un paquete de equipos, síguelos en cada ronda y gana conforme avanzan. Se acabó el todo-para-uno — aquí todos siguen en el juego.",
  "landing.feature1": "Hecho para ~12 amigos y familia",
  "landing.feature2": "Premios en cada fase",
  "landing.tab.join": "Unirme",
  "landing.tab.login": "Ya estoy dentro",
  "landing.name": "Tu nombre",
  "landing.name.ph": "ej. Don Xaviloneo",
  "landing.pin": "PIN de 4 dígitos",
  "landing.pin.help":
    "Elige algo fácil de recordar — es como vuelves a entrar.",
  "landing.code": "Código de acceso",
  "landing.code.ph": "Pídeselo al organizador",
  "landing.modpin": "PIN del organizador",
  "landing.modpin.ph": "Por defecto 0000",
  "landing.btn.join": "Unirme y elegir paquete",
  "landing.btn.mod": "Abrir panel del organizador",
  "landing.btn.login": "Entrar",
  "landing.toMod": "¿Organizador? Entra aquí",
  "landing.backPlayer": "← Volver al acceso de jugadores",
  "landing.demo": "Cargar quiniela demo",
  "landing.footnote":
    "¿Amigos poco tecnológicos? El organizador puede agregar a cualquiera y elegir paquetes por ellos desde el panel de Admin.",
  "err.nameAndPin": "Escribe tu nombre y un PIN de 4 dígitos.",
  "err.code": "Ese código de acceso no coincide.",
  "err.nameTaken": "Ese nombre ya existe — mejor intenta entrar.",
  "err.noMatch": "No hay coincidencia para ese nombre y PIN.",
  "err.modPin": "PIN de organizador incorrecto.",

  "draw.title": "Elige tu paquete",
  "draw.desc1":
    "Cada paquete tiene un equipo de cada bombo — una estrella más apoyo. Los paquetes premium cuestan más (mejores probabilidades), pero ",
  "draw.descBold": "el reparto del bote es igual para todos",
  "draw.desc2":
    ". Un paquete underdog barato que llega lejos paga igual que un favorito.",
  "draw.underdogBonus": "Bono 1.5× en eliminatorias",
  "draw.buyIn": "entrada",
  "draw.yourPackage": "Tu paquete",
  "draw.takenBy": "Lo tiene {name}",
  "draw.choose": "Elegir este paquete",
  "tier.premium": "Premium",
  "tier.mid": "Contendiente",
  "tier.value": "Underdog",
  "tier.premium.blurb":
    "Construido en torno a un favorito al título. Entrada más alta, mejores probabilidades.",
  "tier.mid.blurb": "Una buena estrella con apoyo equilibrado. El punto justo.",
  "tier.value.blurb":
    "Sin favoritos — todo por ganar. La entrada más barata y el mayor multiplicador.",

  "dash.noPackage": "Aún no has elegido un paquete.",
  "dash.pickMy": "Elegir mi paquete",
  "dash.rank": "Tu posición",
  "dash.of": "de {n}",
  "dash.totalPoints": "Puntos totales",
  "dash.teamsPicks": "{teams} equipos · {picks} picks",
  "dash.potShare": "Parte del bote",
  "dash.owedSoFar": "acumulado",
  "dash.grpKo": "{grp} gr · {ko} el",
  "dash.underdog": "1.5× underdog",
  "dash.bonusPicks": "Tus picks extra",
  "dash.bonusDesc":
    "Independiente de tus equipos — una forma de subir aunque tus paquetes fallen.",
  "dash.champion": "Campeón (+{n} pts)",
  "dash.pickTeam": "— elige un equipo —",
  "dash.goldenBoot": "Botín de Oro — goleador (+{n} pts)",
  "dash.scorer.ph": "ej. Mbappé",
  "dash.darkHorse": "Caballo negro — llega a cuartos (+{n} pts)",
  "dash.pick.champion": "Campeón",
  "dash.pick.scorer": "Goleador",
  "dash.pick.darkhorse": "Caballo negro",

  "lb.title": "Tabla de posiciones",
  "lb.playersPot": "{n} jugadores · bote {pot}",
  "lb.you": "tú",
  "lb.organizer": "organizador",
  "lb.pts": "pts",
  "lb.empty": "Nadie ha elegido paquete todavía.",

  "fx.title": "Grupos y partidos",
  "fx.tab.groups": "grupos",
  "fx.tab.schedule": "calendario",
  "fx.group": "Grupo {g}",
  "fx.matchups": "Enfrentamientos",
  "fx.groupStage": "Fase de grupos · {window}",
  "fx.advanceNote":
    "48 equipos · 12 grupos · los 2 primeros de cada grupo más los 8 mejores terceros avanzan a dieciseisavos.",

  "stage.group": "Fase de grupos",
  "stage.r32": "Dieciseisavos",
  "stage.r16": "Octavos",
  "stage.qf": "Cuartos de final",
  "stage.sf": "Semifinal",
  "stage.final": "Final",
  "stage.champion": "Campeón 🏆",
  "stage.eliminated": "Eliminado",
  "stageOpt.group": "En fase de grupos",
  "stageOpt.eliminated": "Eliminado (grupos)",
  "ko.r32": "Dieciseisavos",
  "ko.r16": "Octavos de final",
  "ko.qf": "Cuartos de final",
  "ko.sf": "Semifinales",
  "ko.final": "Final",

  "admin.title": "Panel del organizador",
  "admin.tab.results": "Resultados",
  "admin.tab.people": "Personas",
  "admin.tab.answers": "Respuestas",
  "admin.tab.settings": "Ajustes",
  "admin.results.desc":
    "Captura los resultados conforme avanza el torneo. El G-E-P del grupo da los puntos de grupo; el menú de fase da los premios de eliminatorias. La tabla se actualiza al instante.",
  "admin.people.add": "Agregar persona",
  "admin.people.name": "Nombre",
  "admin.people.namePh": "ej. Tío Beto",
  "admin.people.pin": "PIN",
  "admin.people.addBtn": "Agregar",
  "admin.people.players": "Jugadores ({n})",
  "admin.people.noPackage": "— sin paquete —",
  "admin.people.taken": " (ocupado)",
  "admin.answers.title": "Respuestas finales (para los picks extra)",
  "admin.answers.desc":
    "Configúralas cuando se sepan para calificar los picks extra de todos. Los picks de caballo negro se califican solos desde la pestaña Resultados.",
  "admin.answers.champion": "Campeón",
  "admin.answers.notDecided": "— sin definir —",
  "admin.answers.scorer": "Botín de Oro (goleador)",
  "admin.answers.scorerPh": "Nombre del jugador",
  "admin.answers.save": "Guardar respuestas",
  "admin.settings.pool": "Ajustes de la quiniela",
  "admin.settings.name": "Nombre de la quiniela",
  "admin.settings.currency": "Moneda",
  "admin.settings.joinCode": "Código de acceso",
  "admin.settings.copied": "Copiado — compártelo con el grupo.",
  "admin.settings.buyIns": "Entradas por nivel",
  "admin.settings.apply": "Aplicar precios a los paquetes",
  "admin.settings.applyNote":
    "Reconstruye los 12 paquetes con los precios actuales. Hazlo antes de que la gente empiece a elegir.",
  "admin.settings.danger": "Zona de peligro",
  "admin.settings.loadDemo": "Cargar quiniela demo",
  "admin.settings.reset": "Reiniciar quiniela",
  "admin.settings.resetConfirm":
    "¿Reiniciar todo? Esto borra a todos los jugadores y resultados.",
};

const DICTS: Record<Locale, Dict> = { en: EN, es: ES };

function interpolate(s: string, params?: Record<string, string | number>) {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`,
  );
}

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const Ctx = createContext<LocaleCtx | null>(null);

function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "es";
  const lang = (navigator.language || "").toLowerCase();
  return lang.startsWith("en") ? "en" : "es";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORE_KEY) as Locale | null;
    setLocaleState(stored ?? detectLocale());
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") window.localStorage.setItem(STORE_KEY, l);
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    const dict = DICTS[locale];
    return interpolate(dict[key] ?? EN[key] ?? key, params);
  };

  return <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>;
}

export function useT() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useT must be used within LocaleProvider");
  return ctx;
}
