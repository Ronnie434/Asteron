import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography } from './Typography';
import { theme } from '../theme';

interface SimpleMarkdownProps {
  content: string;
}

export function SimpleMarkdown({ content }: SimpleMarkdownProps) {
  // Split by newlines but keep track of blocks
  const lines = content.split('\n');

  return (
    <View style={styles.container}>
      {lines.map((line, index) => {
        const key = `${index}-${line.substring(0, 10)}`;
        
        // Skip empty lines (layout handled by margin)
        if (!line.trim()) {
           return <View key={key} style={styles.spacer} />;
        }

        // H1: # Title
        if (line.startsWith('# ')) {
          return (
            <Typography key={key} variant="title2" style={styles.h1}>
              {line.replace('# ', '')}
            </Typography>
          );
        }

        // H2: ## Title
        if (line.startsWith('## ')) {
          return (
            <Typography key={key} variant="headline" style={styles.h2}>
              {line.replace('## ', '')}
            </Typography>
          );
        }

        // H3: ### Title
        if (line.startsWith('### ')) {
          return (
            <Typography key={key} variant="subhead" style={styles.h3}>
              {line.replace('### ', '')}
            </Typography>
          );
        }

        // List item: - Item
        if (line.trim().startsWith('- ')) {
          return (
            <View key={key} style={styles.listItem}>
              <View style={styles.bullet} />
              <Typography variant="body" style={styles.listItemText}>
                {line.replace('- ', '').replace(/\*\*/g, '')}
              </Typography>
            </View>
          );
        }

        // Table row (simple rendering)
        if (line.includes('|')) {
           // Skip separator lines like |---|---|
           if (line.match(/\|[-]+\|/)) return null;

           const cols = line.split('|').filter(c => c.trim());
           return (
             <View key={key} style={styles.tableRow}>
               {cols.map((col, i) => (
                 <View key={i} style={styles.tableCol}>
                    <Typography variant="caption1" color={theme.colors.textSecondary}>
                      {col.trim()}
                    </Typography>
                 </View>
               ))}
             </View>
           );
        }

        // Clean up bold syntax **text** for plain paragraphs
        const cleanLine = line.replace(/\*\*/g, '');

        return (
          <Typography key={key} variant="body" style={styles.paragraph}>
            {cleanLine}
          </Typography>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  spacer: {
    height: 12,
  },
  h1: {
    marginTop: 24,
    marginBottom: 16,
    color: theme.colors.primary,
  },
  h2: {
    marginTop: 20,
    marginBottom: 12,
    color: theme.colors.text,
  },
  h3: {
    marginTop: 16,
    marginBottom: 8,
    color: theme.colors.text,
    fontWeight: '600',
  },
  paragraph: {
    marginBottom: 4,
    lineHeight: 24,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginTop: 8,
    marginRight: 12,
  },
  listItemText: {
    flex: 1,
    lineHeight: 22,
  },
  tableRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.separator,
  },
  tableCol: {
    flex: 1,
    paddingHorizontal: 4,
  }
});
