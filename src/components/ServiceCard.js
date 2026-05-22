import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

export default function ServiceCard({ service, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.card, selected ? styles.cardSelected : null]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.iconWrapper, selected ? styles.iconWrapperSelected : null]}>
        <Text style={styles.icon}>{service.icon}</Text>
      </View>
      <Text style={[styles.label, selected ? styles.labelSelected : null]}>
        {service.label}
      </Text>
      <Text style={styles.description}>{service.description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: colors.gray,
    borderRadius: 16,
    padding: 16,
    margin: 6,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.grayBorder,
  },
  cardSelected: {
    borderColor: colors.yellow,
    backgroundColor: '#1A1600',
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.grayMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  iconWrapperSelected: {
    backgroundColor: colors.yellow,
  },
  icon: {
    fontSize: 26,
  },
  label: {
    color: colors.white,
    fontSize: 16,
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 1,
    marginBottom: 4,
  },
  labelSelected: {
    color: colors.yellow,
  },
  description: {
    color: colors.grayLight,
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
  },
});
