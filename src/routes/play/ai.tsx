import { createFileRoute } from "@tanstack/react-router";
import AiPlayScreen from "#/features/atomr/components/AiPlayScreen";

export const Route = createFileRoute("/play/ai")({
	component: AiPlayRoute,
});

function AiPlayRoute() {
	return <AiPlayScreen />;
}
