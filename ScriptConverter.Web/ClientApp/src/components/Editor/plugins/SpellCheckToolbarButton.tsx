import { ActionIcon, Tooltip } from '@mantine/core';
import { IconAbc } from '@tabler/icons-react';
import { useSpellCheck } from './SpellCheckContext';
import { useI18n } from '../../../i18n';

/**
 * Toolbar button that opens the spell check panel.
 * Uses SpellCheckContext to toggle the panel state.
 */
export default function SpellCheckToolbarButton() {
  const { openPanel, isPanelOpen, misspelledWords } = useSpellCheck();
  const { t } = useI18n();

  return (
    <Tooltip label={t('spellCheckToolbar')} position="bottom" withArrow>
      <ActionIcon
        variant={isPanelOpen ? 'filled' : 'subtle'}
        size="sm"
        onClick={openPanel}
        aria-label={t('spellCheckToolbar')}
        aria-pressed={isPanelOpen}
        color={misspelledWords.length > 0 ? 'red' : undefined}
      >
        <IconAbc size={16} />
      </ActionIcon>
    </Tooltip>
  );
}
