import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import Header from '../components/Header'
import { DoodleBackground } from '../components/doodle-background'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Parrot — Voice dictation that just works',
      },
      {
        name: 'description',
        content: 'Voice dictation for Mac. 3x faster than typing, with AI cleanup, custom vocabulary, and local-first privacy.',
      },
      {
        name: 'theme-color',
        content: '#7cb342',
      },
      {
        property: 'og:site_name',
        content: 'Parrot',
      },
      {
        property: 'og:image',
        content: 'https://tryparrot.app/og-image.png',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:image',
        content: 'https://tryparrot.app/og-image.png',
      },
      {
        name: 'robots',
        content: 'index, follow',
      },
      {
        property: 'og:locale',
        content: 'en_US',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        href: '/favicon.ico',
        type: 'image/x-icon',
      },
      {
        rel: 'apple-touch-icon',
        href: '/logo192.png',
        sizes: '192x192',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Header />
        <div className="relative min-h-screen">
          <DoodleBackground opacity={0.07} />
          <div className="relative">{children}</div>
        </div>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
