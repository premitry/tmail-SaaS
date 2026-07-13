// Helper HTML bersama (escape, shell, dark-mode, tailwind CDN).

export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function attr(s: unknown): string {
  return esc(s);
}

// <head> standar: Tailwind (CDN) + Font Awesome + toggle dark mode.
export function head(title: string, extra = ""): string {
  return `<!DOCTYPE html><html lang="id" class=""><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<script src="https://cdn.tailwindcss.com"></script>
<script>tailwind.config={darkMode:'class'}</script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
<link rel="icon" href="/favicon.svg" />
<script>
  (function(){ if(localStorage.getItem('darkmode')==='enabled') document.documentElement.classList.add('dark'); })();
  function enableDarkMode(){document.documentElement.classList.add('dark');localStorage.setItem('darkmode','enabled');}
  function disableDarkMode(){document.documentElement.classList.remove('dark');localStorage.setItem('darkmode','disabled');}
  function toggleDark(){document.documentElement.classList.contains('dark')?disableDarkMode():enableDarkMode();}
</script>
${extra}
</head>`;
}

export function faviconSvg(emoji = "📮"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${emoji}</text></svg>`;
}
