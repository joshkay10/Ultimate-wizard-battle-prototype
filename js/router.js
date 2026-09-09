const ROUTES = ['play', 'rules', 'elements', 'todo'];

function routeFromPathname() {
  const file = (location.pathname.split('/').pop() || '').toLowerCase();
  if (file === 'rules.html') return 'rules';
  if (file === 'todo.html') return 'todo';
  if (file === 'elements.html') return 'elements';
  return null;
}

function currentRoute() {
  if (typeof window !== 'undefined' && window.SITE_ROUTE && ROUTES.indexOf(window.SITE_ROUTE) >= 0) {
    return window.SITE_ROUTE;
  }
  const fromFile = routeFromPathname();
  if (fromFile) return fromFile;
  const hash = (location.hash || '').replace(/^#\/?/, '').split('?')[0].split('/')[0];
  if (hash === 'rules' || hash === 'todo' || hash === 'elements') return hash;
  return 'play';
}

function routeHref(route) {
  if (route === 'play') return './index.html';
  return './' + route + '.html';
}

function routeTitle(route) {
  if (route === 'rules') return 'Rules — Wizard Battle';
  if (route === 'elements') return 'Elements — Wizard Battle';
  if (route === 'todo') return 'To-do — Wizard Battle';
  return 'Wizard Battle — Prototype';
}
