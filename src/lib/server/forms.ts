export function formDataHasCheckedValue(formData: FormData, fieldName: string) {
	return formData.get(fieldName) === 'on';
}

export function getOptionalTrimmedString(formData: FormData, fieldName: string) {
	const value = formData.get(fieldName);

	if (typeof value !== 'string') {
		return undefined;
	}

	const trimmed = value.trim();

	return trimmed || undefined;
}
