import { useId } from "react";

type AtomRMarkProps = {
	size?: number;
	title?: string;
	className?: string;
};

export default function AtomRMark({
	size = 24,
	title,
	className,
}: AtomRMarkProps) {
	const id = useId();
	const frameId = `${id}-frame`;
	const burstId = `${id}-burst`;
	const coreId = `${id}-core`;

	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 64 64"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden={title ? undefined : true}
			aria-label={title}
			className={className}
		>
			{title ? <title>{title}</title> : null}
			<defs>
				<linearGradient
					id={frameId}
					x1="10"
					y1="8"
					x2="54"
					y2="56"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#1C2634" />
					<stop offset="1" stopColor="#0B1017" />
				</linearGradient>
				<linearGradient
					id={burstId}
					x1="21"
					y1="18"
					x2="44"
					y2="42"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#35D6E7" />
					<stop offset="1" stopColor="#FF6B3D" />
				</linearGradient>
				<linearGradient
					id={coreId}
					x1="26"
					y1="24"
					x2="38"
					y2="38"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#F8FBFF" />
					<stop offset="1" stopColor="#CDD7EA" />
				</linearGradient>
			</defs>

			<rect
				x="8"
				y="8"
				width="48"
				height="48"
				rx="16"
				fill={`url(#${frameId})`}
			/>
			<path d="M32 14L36 22H28L32 14Z" fill="#35D6E7" />
			<path d="M50 32L42 36V28L50 32Z" fill="#FF6B3D" />
			<path d="M32 50L28 42H36L32 50Z" fill="#35D6E7" />
			<path d="M14 32L22 28V36L14 32Z" fill="#FF6B3D" />
			<path
				d="M32 20L44 32L32 44L20 32L32 20Z"
				fill={`url(#${burstId})`}
				fillOpacity="0.18"
				stroke={`url(#${burstId})`}
				strokeWidth="2.6"
			/>
			<circle cx="32" cy="32" r="6.2" fill={`url(#${coreId})`} />
			<circle
				cx="32"
				cy="32"
				r="10"
				fill="none"
				stroke="#FFFFFF"
				strokeOpacity="0.08"
				strokeWidth="1.2"
			/>
			<circle cx="24" cy="24" r="2.2" fill="#35D6E7" />
			<circle cx="40" cy="24" r="2.2" fill="#FF6B3D" />
			<circle cx="24" cy="40" r="2.2" fill="#FF6B3D" />
			<circle cx="40" cy="40" r="2.2" fill="#35D6E7" />
		</svg>
	);
}
