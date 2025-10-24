import Header from '@/components/Header';
import styles from './page.module.scss';

export default function Home() {
  return (
    <main>
      <Header />
      <section className={styles.wrap}>
        <h1 className={styles.title}>Clothing Retail Accounting</h1>
        <p className={styles.subtitle}>Auth powered by Clerk. Next: UI & DB.</p>
      </section>
    </main>
  );
}
