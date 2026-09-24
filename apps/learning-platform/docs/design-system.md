# Junior Mode design system

This document defines the presentation contract for the Junior Mode web application. It applies to the welcome and authentication flows, the application shell, Mentor and Learner dashboards, and account settings.

## Principles

1. **Learning stays primary.** The interface should clarify the current learning context without making the product feel like surveillance or a scorecard.
2. **One hierarchy per screen.** A page has one visible title, sections have descriptive headings, and actions sit beside the content they affect.
3. **State is explicit.** Status is communicated with words and, when useful, an icon or dot. Color is supporting information, never the only information.
4. **The same pattern means the same thing.** Pages compose shared product components from shadcn/Base UI primitives instead of recreating borders, focus rings, validation text, or loading indicators.
5. **Responsive and keyboard-first.** Every workflow remains operable at mobile, tablet, and desktop widths and with keyboard navigation alone.

## Semantic tokens

Tokens are defined in `resources/css/app.css` as light and dark OKLCH values and exposed to Tailwind through `@theme`.

| Token family               | Purpose                                                 |
| -------------------------- | ------------------------------------------------------- |
| `background`, `foreground` | Application canvas and primary text                     |
| `card`, `popover`          | Elevated content and transient surfaces                 |
| `primary`                  | Primary actions, selected emphasis, and brand identity  |
| `secondary`                | Lower-emphasis actions and neutral role markers         |
| `muted`                    | Subdued surfaces and supporting copy                    |
| `accent`                   | Hover, active navigation, and selected controls         |
| `border`, `input`, `ring`  | Structure, form boundaries, and visible focus           |
| `info`                     | Informational state that does not require action        |
| `success`                  | Confirmed successful completion                         |
| `warning`                  | A condition that needs attention but is not destructive |
| `destructive`              | Irreversible actions and validation failures            |
| `sidebar-*`                | Shell navigation surfaces and their interactive states  |

Use semantic utilities such as `text-muted-foreground`, `bg-success/10`, and `border-warning/30`. Do not add one-off hex, RGB, or palette colors to a page when a semantic token expresses the intent.

### Typography

- Page titles: `text-2xl sm:text-3xl`, semibold, tight tracking.
- Section titles: `text-base`, semibold.
- Body copy: default size with comfortable line height.
- Supporting copy: `text-sm text-muted-foreground`.
- Eyebrows: short uppercase labels with increased tracking. They identify context, not status.

Use sentence case. Preserve the glossary capitalization for Learner, Mentor, Competency, Coaching Priority, Observation, Work Item, Hint, and other defined domain terms.

### Spacing, radius, and elevation

- Use a 4px-based Tailwind spacing rhythm and `gap` for sibling spacing.
- Use `rounded-md` for controls, `rounded-lg` for nested product compositions, and `rounded-xl` for cards.
- Borders provide normal separation. `shadow-xs` belongs to controls or small floating elements; `shadow-sm` belongs to cards; `shadow-lg` is reserved for a single focal panel such as authentication.
- Avoid stacked borders and shadows. A component should communicate one elevation level.

### Icons and motion

- Use Lucide icons at `size-4` or `size-5`. Mark decorative icons with `aria-hidden="true"`.
- Icon-only controls require an accessible name.
- Motion should explain state or hierarchy. Keep transitions short and limited to color, opacity, transform, or shadow.
- The global reduced-motion rule collapses animation and transition durations when `prefers-reduced-motion: reduce` is active.

## Primitive layer

`resources/js/components/ui` is the only primitive component layer. These components own low-level focus, disabled, invalid, hover, active, and dark-mode behavior.

The shadcn configuration is pinned to `base-vega`, with `@base-ui/react` providing the headless primitives. Compose Base UI parts with their `render` prop. For semantic links that look like buttons, apply `buttonVariants` directly to the link instead of rendering the link through `Button`.

| Need                                               | Primitive                                                  |
| -------------------------------------------------- | ---------------------------------------------------------- |
| Actions and links styled as actions                | `Button`                                                   |
| Text, password, selection, checkbox, and OTP input | `Input`, `PasswordInput`, `Select`, `Checkbox`, `InputOTP` |
| Field labels                                       | `Label`                                                    |
| Content grouping                                   | `Card`                                                     |
| Role and state labels                              | `Badge`                                                    |
| Inline feedback                                    | `Alert`                                                    |
| Menus and navigation                               | `DropdownMenu`, `NavigationMenu`, `Sidebar`, `Breadcrumb`  |
| Confirmation and mobile overlays                   | `Dialog`, `Sheet`                                          |
| Theme selection                                    | `ToggleGroup`                                              |
| Loading placeholders and progress                  | `Skeleton`, `Spinner`                                      |
| Contextual help and notifications                  | `Tooltip`, `Sonner`                                        |

The semantic `Alert` and `Badge` variants are `default`, `info`, `success`, `warning`, and `destructive` where applicable. Buttons support `default`, `secondary`, `outline`, `ghost`, `link`, and `destructive`.

## Product compositions

Product components in `resources/js/components` combine primitives without hiding domain meaning.

| Composition      | Use                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| `PageHeader`     | The one visible page title, description, optional context eyebrow, and page-level actions       |
| `SectionHeading` | A heading and description inside a settings or detail section                                   |
| `SectionCard`    | A titled dashboard section with an optional icon and action                                     |
| `EmptyState`     | A bounded absence of content with a title, explanation, optional icon, and optional next action |
| `StatusBadge`    | A compact, text-labelled role or status using a semantic tone                                   |
| `FormField`      | A label, control, supporting description, and validation message                                |
| `SubmitButton`   | Submit processing, disabled state, spinner, and visible processing label                        |

### Dashboard pattern

```tsx
<PageHeader
    eyebrow="Mentor workspace"
    title="Mentor dashboard"
    description="Invite Learners and guide their development."
/>
<SectionCard title="Your Learners" icon={Users}>
    {/* list or EmptyState */}
</SectionCard>
```

### Empty-state pattern

```tsx
<EmptyState
    icon={Inbox}
    title="No Learners yet"
    description="Send an invitation to start your private mentoring workspace."
/>
```

Empty states explain what is absent and what will cause it to appear. They do not describe normal loading; use `Skeleton` for deferred or loading content.

### Status pattern

```tsx
<StatusBadge tone="info">Learner</StatusBadge>
```

Choose the tone by meaning: neutral for classification, info for contextual state, success for confirmed completion, warning for attention, and destructive for failure or irreversible impact.

### Form pattern

```tsx
<FormField id="email" label="Email address" error={errors.email}>
    <Input
        id="email"
        name="email"
        aria-invalid={Boolean(errors.email)}
        aria-describedby={errors.email ? 'email-error' : undefined}
    />
</FormField>
<SubmitButton processing={processing} processingLabel="Sending…">
    Send invitation
</SubmitButton>
```

Validation appears next to its control, uses `role="alert"`, and is connected with `aria-describedby`. Processing buttons are disabled, expose `aria-busy`, retain their width where practical, and replace their label with a specific present-participle phrase.

## State coverage

- **Default, hover, focus, active:** owned by primitives. Focus must remain visibly distinct in both themes.
- **Disabled:** the control is non-interactive and visually subdued; it must not be the only explanation for unavailable work.
- **Loading:** use `SubmitButton` for mutations and `Skeleton` for deferred page content. Use `Spinner` only within an element that names the operation.
- **Success, warning, destructive, info:** use semantic `Alert`, `Badge`, or `StatusBadge` variants and include explanatory text.
- **Empty:** use `EmptyState`; do not show an empty bordered list.
- **Validation error:** set `aria-invalid`, connect the error text, and keep the user's input intact unless the security workflow requires reset.

## Layout and accessibility

- Pages use `min-w-0` in grid and flex children that can contain user-provided text.
- Actions wrap or stack on narrow screens. Avoid fixed widths except bounded side panels with a flexible primary column.
- Lists of people or invitations truncate long identifiers while retaining the full string in the DOM.
- Each page has one visible `h1`; cards and sections use logical `h2` and `h3` headings.
- Use `main`, `header`, `nav`, `aside`, and `section` landmarks according to purpose.
- Navigation identifies the current destination with `aria-current="page"`.
- Dialogs have a title and description. Destructive dialogs state permanence before confirmation.
- All interactive elements have accessible names and keyboard-visible focus. Do not attach click behavior to a non-interactive element.
- Verify light and dark themes, 320px mobile width, keyboard order, zoom at 200%, and reduced motion before merging a new pattern.

## Shipped-surface audit

| Previous pattern                                                              | Standard mapping                                                                                         |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Laravel starter-kit welcome illustration, hard-coded colors, and custom links | Product welcome composition using `Button`, `Card`, `StatusBadge`, semantic tokens, and Wayfinder routes |
| Dashboard-local card headings and icon wells                                  | `SectionCard`                                                                                            |
| Dashboard and passkey dashed placeholders                                     | `EmptyState`                                                                                             |
| Page-local role badges                                                        | `StatusBadge`                                                                                            |
| Repeated label/input/error groups                                             | `FormField`                                                                                              |
| Repeated spinner/button conditionals                                          | `SubmitButton`                                                                                           |
| Page-local green, red, and yellow feedback                                    | Semantic `Alert` variants                                                                                |
| Starter-kit neutral palette classes in shell, avatar, and theme controls      | Semantic foreground, secondary, accent, and sidebar tokens                                               |
| Custom appearance buttons                                                     | Base UI `ToggleGroup` composition                                                                        |
| Settings sidebar spacing and active color                                     | Responsive `Button` navigation with `aria-current`                                                       |

## Adding or changing components

1. Search `resources/js/components/ui` and the product compositions before creating anything.
2. Name the state or recurring product concept being solved. Do not add a generic wrapper solely to shorten class lists.
3. Add a shadcn/Base UI primitive only when the product has a concrete interaction that existing primitives cannot express. Keep its upstream API and accessibility behavior recognizable.
4. Use existing semantic tokens. If a new semantic meaning is genuinely needed, add paired light/dark tokens and document them here.
5. Cover visible behavior, accessible names, keyboard interaction, validation, and processing states in a component or page test.
6. Run formatting, type checking, lint, component tests, and the production build. Run affected Laravel feature tests when an Inertia prop or route contract changes.
