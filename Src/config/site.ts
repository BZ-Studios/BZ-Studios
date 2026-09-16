export const siteConfig = {
  name: 'B&Z Studios',
  shortName: 'B&Z',
  url: 'https://bzstudios.com.ar',
  locale: 'es-AR',
  description: 'B&Z Studios es un estudio independiente de videojuegos de Argentina. Descubrí proyectos originales y juegos para disfrutar directamente desde el navegador.',
  navigation: [
    { label: 'Inicio', href: '/' },
    { label: 'Juegos', href: '/juegos/' },
    { label: 'Sobre nosotros', href: '/sobre-nosotros/' },
    { label: 'Ayuda', href: '/ayuda/' },
    { label: 'Contacto', href: '/contacto/' },
  ],
  members: ['Luis Zabala', 'Agustín Bustamante'],
  socialLinks: {
    instagram: '',
    x: '',
    tiktok: '',
    youtube: '',
    discord: '',
    email: '',
  },
  footerSocials: ['instagram', 'tiktok'],
} as const;

export type SocialKey = keyof typeof siteConfig.socialLinks;
