export const siteConfig = {
  name: 'B&Z Studios',
  description: 'Estudio independiente de videojuegos creado por Luis Zabala y Agustín Bustamante.',
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
