import { DensityMode } from '@/contexts/DensityContext'

/**
 * Centralized density tokens for consistent UI spacing and typography
 * across all pages in ForgeNursing.
 */

export interface DensityTokens {
  // Typography
  bodyText: string
  bodyTextMobile: string
  inputText: string
  inputTextMobile: string
  chatMessage: string
  chatMessageMobile: string
  heading: string
  subheading: string
  smallText: string
  
  // Line heights
  lineHeight: string
  lineHeightTight: string
  
  // Container widths (desktop)
  containerMaxWidth: string
  containerMaxWidthNarrow: string
  containerMaxWidthWide: string
  
  // Padding
  cardPadding: string
  cardPaddingMobile: string
  sectionPadding: string
  sectionPaddingMobile: string
  
  // Chat-specific
  chatBubblePadding: string
  chatBubblePaddingMobile: string
  chatMessageSpacing: string
  chatMessageSpacingMobile: string
  chatComposerMinHeight: string
  chatComposerMinHeightMobile: string
  chatComposerPadding: string
  chatComposerPaddingMobile: string
  chatContainerHeight: string
  chatContainerHeightMobile: string
  
  // Sidebar-specific
  sidebarText: string
  sidebarIconSize: string
  sidebarItemPadding: string
  sidebarItemSpacing: string
}

export function getDensityTokens(density: DensityMode): DensityTokens {
  if (density === 'comfort') {
    return {
      // Typography - Comfort: Larger, more readable
      bodyText: 'text-base md:text-lg',
      bodyTextMobile: 'text-base',
      inputText: 'text-base md:text-lg',
      inputTextMobile: 'text-base',
      chatMessage: 'text-base md:text-lg',
      chatMessageMobile: 'text-base',
      heading: 'text-2xl md:text-3xl',
      subheading: 'text-lg md:text-xl',
      smallText: 'text-sm md:text-base',
      
      // Line heights - Comfort: More breathing room
      lineHeight: 'leading-relaxed',
      lineHeightTight: 'leading-normal',
      
      // Container widths - Comfort: Wider for better space usage
      containerMaxWidth: 'max-w-5xl',
      containerMaxWidthNarrow: 'max-w-4xl',
      containerMaxWidthWide: 'max-w-6xl',
      
      // Padding - Comfort: More generous spacing
      cardPadding: 'p-6 md:p-8',
      cardPaddingMobile: 'p-6',
      sectionPadding: 'py-8 md:py-10',
      sectionPaddingMobile: 'py-8',
      
      // Chat-specific - Comfort: Roomier, more readable, more vertical space
      chatBubblePadding: 'p-5 md:p-6',
      chatBubblePaddingMobile: 'p-5',
      chatMessageSpacing: 'space-y-6 md:space-y-8',
      chatMessageSpacingMobile: 'space-y-6',
      chatComposerMinHeight: 'min-h-[64px] md:min-h-[72px]',
      chatComposerMinHeightMobile: 'min-h-[64px]',
      chatComposerPadding: 'p-5 md:p-6',
      chatComposerPaddingMobile: 'p-5',
      chatContainerHeight: 'h-[650px] md:h-[750px]',
      chatContainerHeightMobile: 'h-[650px]',
      
      // Sidebar-specific - Comfort: Larger, more touch-friendly
      sidebarText: 'text-base md:text-lg',
      sidebarIconSize: 'w-5 h-5 md:w-6 md:h-6',
      sidebarItemPadding: 'px-4 py-4 md:py-5',
      sidebarItemSpacing: 'space-y-2',
    }
  } else {
    // Compact mode
    return {
      // Typography - Compact: Smaller but still readable
      bodyText: 'text-sm md:text-base',
      bodyTextMobile: 'text-sm',
      inputText: 'text-sm md:text-base',
      inputTextMobile: 'text-sm',
      chatMessage: 'text-sm md:text-base',
      chatMessageMobile: 'text-sm',
      heading: 'text-xl md:text-2xl',
      subheading: 'text-base md:text-lg',
      smallText: 'text-xs md:text-sm',
      
      // Line heights - Compact: Tighter but still readable
      lineHeight: 'leading-normal',
      lineHeightTight: 'leading-snug',
      
      // Container widths - Compact: Slightly narrower
      containerMaxWidth: 'max-w-4xl',
      containerMaxWidthNarrow: 'max-w-3xl',
      containerMaxWidthWide: 'max-w-5xl',
      
      // Padding - Compact: More efficient spacing
      cardPadding: 'p-4 md:p-5',
      cardPaddingMobile: 'p-4',
      sectionPadding: 'py-6 md:py-8',
      sectionPaddingMobile: 'py-6',
      
      // Chat-specific - Compact: Tighter but functional, still more vertical space
      chatBubblePadding: 'p-3 md:p-4',
      chatBubblePaddingMobile: 'p-3',
      chatMessageSpacing: 'space-y-4 md:space-y-5',
      chatMessageSpacingMobile: 'space-y-4',
      chatComposerMinHeight: 'min-h-[52px] md:min-h-[56px]',
      chatComposerMinHeightMobile: 'min-h-[52px]',
      chatComposerPadding: 'p-3 md:p-4',
      chatComposerPaddingMobile: 'p-3',
      chatContainerHeight: 'h-[600px] md:h-[700px]',
      chatContainerHeightMobile: 'h-[600px]',
      
      // Sidebar-specific - Compact: Still larger than before but more efficient
      sidebarText: 'text-sm md:text-base',
      sidebarIconSize: 'w-5 h-5',
      sidebarItemPadding: 'px-4 py-3 md:py-4',
      sidebarItemSpacing: 'space-y-1.5',
    }
  }
}

