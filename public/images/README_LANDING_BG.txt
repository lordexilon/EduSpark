Fondo del hero (landing principal)
==================================
El hero usa por defecto un fondo abstracto en código (CSS + SVG) en
`src/pages/Common/LandingPage.tsx` (componente `HeroAbstractBackdrop`).

No uses como fondo una captura de pantalla del propio hero (titular + botones):
genera “ghosting” (texto y CTAs duplicados/semidesplazados).

Opcional: si más adelante querés una imagen raster, que sea solo textura/red
sin tipografía ni UI; entonces se puede volver a enlazar como `background-image`.

Ruta pública típica si se reactiva asset: /images/landing-hero-bg.png
