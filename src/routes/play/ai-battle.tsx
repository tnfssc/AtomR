import { createFileRoute } from "@tanstack/react-router";
import AiBattleScreen from "#/features/atomr/components/AiBattleScreen";

export const Route = createFileRoute("/play/ai-battle")({
	component: AiBattleRoute,
});

function AiBattleRoute() {
	return <AiBattleScreen />;
}
