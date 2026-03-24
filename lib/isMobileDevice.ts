export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent;
  
  // 1. Deteção básica de OS mobile via User Agent
  const isMobileOS = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  
  // 2. Edge case da Apple: iPads modernos pedem a versão "Desktop" dos sites e enviam UA de Mac.
  //    Como os Macs não têm telas touch (até o momento), se for Mac e tiver touch, é um iPad.
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  // 3. Checagem de hardware touch. Usamos > 0 e não > 1 para cobrir dispositivos stylus/single-touch antigos,
  //    embora telas modernas sejam multi-touch.
  const hasTouchScreen = (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - msMaxTouchPoints para IEs antigos
    navigator.msMaxTouchPoints > 0
  );

  // A regra de ouro:
  // Tem que ter um SO declaradamente móvel (ou o edge case do iPad) E ter a capacidade de toque no hardware.
  // Por que exigir os dois?
  // - Notebook Windows com tela touch: hasTouchScreen é true, mas isMobileOS é false -> Retorna false (vai pro Bottom Sheet)
  // - Celular Android com mouse bluetooth: hasTouchScreen é true (a tela continua lá), isMobileOS é true -> Retorna true (vai pro input nativo)
  return (isMobileOS || isIPadOS) && hasTouchScreen;
}
