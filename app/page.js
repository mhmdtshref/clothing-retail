import styles from './page.module.scss';
export default function Home() {
  return (
    <main>
      <section className={styles.wrap}>
        <h1 className={styles.title}>Clothing Retail Accounting</h1>
        <p className={styles.subtitle}>Project initialized with SCSS. Next: auth, UI, DB.</p>
      </section>
    </main>
  );
}
