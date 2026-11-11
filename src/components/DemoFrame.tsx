import type { ComponentType } from 'preact';
import { lazy, ErrorBoundary } from 'preact-iso';
import { useRef } from 'preact/hooks';

/**
 * Shared frame for embedded project demos.
 *
 * - `src`    -> sandboxed iframe
 * - `loader` -> import.meta.glob loader for the demo component; the chunk is
 *   fetched only once this frame mounts, so heavy demos (v86 machine boots)
 *   stay off the list page
 *
 * Both get the same border, fixed height, and Expand/fullscreen button.
 */
export function DemoFrame(props: { src?: string; title?: string; loader?: () => Promise<{ default: ComponentType }> }) {
	const frame = useRef<HTMLDivElement>(null);

	const fullscreen = () => {
		if (frame.current) (frame.current.requestFullscreen?.() as unknown as Promise<void> | undefined)?.catch(() => {});
	};

	return (
		<div class="detail-demo">
			{props.src ? (
				<div class="demo-frame" ref={frame}>
					<iframe
						src={props.src}
						title={props.title ?? 'demo'}
						loading="lazy"
						sandbox="allow-scripts allow-same-origin allow-forms"
					/>
				</div>
			) : props.loader ? (
				// component demos style their own panes; frame stays bare so the
				// controls sit on the page background
				<div class="demo-frame demo-frame-bare" ref={frame}>
					<ErrorBoundary>
						<Demo loader={props.loader} />
					</ErrorBoundary>
				</div>
			) : null}
			<button class="try-it" onClick={fullscreen}>
				Expand
			</button>
		</div>
	);
}

function Demo(props: { loader: () => Promise<{ default: ComponentType }> }) {
	const C = lazy(props.loader);
	return <C />;
}
