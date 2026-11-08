import { useState } from 'preact/hooks';
import styles from './Counter.module.scss';

export function Counter({ initial = 0 }: { initial?: number }) {
	const [n, setN] = useState(initial);
	return (
		<div class={styles.counter}>
			<button onClick={() => setN(n - 1)}>-</button>
			<output class={styles.value}>{n}</output>
			<button onClick={() => setN(n + 1)}>+</button>
		</div>
	);
}
