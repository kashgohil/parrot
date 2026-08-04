import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { type ReactNode, useState } from "react";

type DeleteConfirmPopoverProps = {
	message: string;
	onConfirm: () => void | Promise<void>;
	isDeleting?: boolean;
	confirmLabel?: string;
	deletingLabel?: string;
	cancelLabel?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	side?: "top" | "right" | "bottom" | "left";
	align?: "start" | "center" | "end";
	/** "click" opens on trigger click; "manual" anchors without toggling on click */
	trigger?: "click" | "manual";
	children: ReactNode;
};

export function DeleteConfirmPopover({
	message,
	onConfirm,
	isDeleting = false,
	confirmLabel = "Delete",
	deletingLabel = "Deleting…",
	cancelLabel = "Cancel",
	open: openProp,
	onOpenChange,
	side = "top",
	align = "end",
	trigger = "click",
	children,
}: DeleteConfirmPopoverProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const isControlled = openProp !== undefined;
	const open = isControlled ? openProp : internalOpen;

	function setOpen(next: boolean) {
		if (!isControlled) setInternalOpen(next);
		onOpenChange?.(next);
	}

	async function handleConfirm() {
		await onConfirm();
		setOpen(false);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			{trigger === "click" ? (
				<PopoverTrigger asChild>{children}</PopoverTrigger>
			) : (
				<PopoverAnchor asChild>{children}</PopoverAnchor>
			)}
			<PopoverContent
				side={side}
				align={align}
				className="w-56 p-3"
				onClick={(e) => e.stopPropagation()}
			>
				<p className="text-sm text-foreground leading-snug mb-3">{message}</p>
				<div className="flex items-center justify-end gap-1">
					<Button
						variant="ghost"
						size="sm"
						disabled={isDeleting}
						onClick={() => setOpen(false)}
						className="h-8 px-2 text-xs"
					>
						{cancelLabel}
					</Button>
					<Button
						variant="ghost"
						size="sm"
						disabled={isDeleting}
						onClick={() => void handleConfirm()}
						className="h-8 px-2 text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
					>
						{isDeleting ? deletingLabel : confirmLabel}
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
