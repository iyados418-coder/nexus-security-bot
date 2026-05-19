import Head from 'next/head';
import '../styles/globals.css';
import AppBoundary from '../components/AppBoundary';

export default function App({ Component, pageProps }) {
  return (
    <AppBoundary>
      <Head>
        <title>Nexus Security — Advanced Discord Protection & Moderation</title>
        <meta name="description" content="Nexus Security Bot — Advanced Discord server protection, moderation, and real-time monitoring dashboard." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </Head>
      <Component {...pageProps} />
    </AppBoundary>
  );
}
