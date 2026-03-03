import {
	Toast,
	ToastClose,
	ToastDescription,
	ToastProvider,
	ToastTitle,
	ToastViewport,
} from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';
import React from 'react';

function ToasterContent() {
	const { toasts } = useToast();

	return (
		<>
			{toasts.map(({ id, title, description, action, ...props }) => {
				// Omit function props (dismiss, update, etc.) so they are not passed
				// as DOM attributes to the underlying Radix elements.
				const { dismiss, update, ...rest } = props;
				return (
					<Toast key={id} {...rest}>
						<div className="grid gap-1">
							{title && <ToastTitle>{title}</ToastTitle>}
							{description && (
								<ToastDescription>{description}</ToastDescription>
							)}
						</div>
						{action}
						<ToastClose />
					</Toast>
				);
			})}
			<ToastViewport />
		</>
	);
}

export function Toaster() {
	return (
		<ToastProvider>
			<ToasterContent />
		</ToastProvider>
	);
}