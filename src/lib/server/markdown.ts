import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

marked.setOptions({
	gfm: true,
	breaks: true
});

export function renderMarkdownToSafeHtml(markdown: string): string {
	if (!markdown.trim()) {
		return '';
	}

	const unsafeHtml = marked.parse(markdown) as string;

	return sanitizeHtml(unsafeHtml, {
		allowedTags: sanitizeHtml.defaults.allowedTags.concat([
			'img',
			'h1',
			'h2',
			'h3',
			'h4',
			'blockquote'
		]),
		allowedAttributes: {
			a: ['href', 'name', 'target', 'rel'],
			img: ['src', 'alt', 'title'],
			code: ['class']
		},
		allowedSchemes: ['http', 'https', 'mailto'],
		transformTags: {
			a: sanitizeHtml.simpleTransform('a', {
				rel: 'noopener noreferrer',
				target: '_blank'
			})
		}
	});
}
