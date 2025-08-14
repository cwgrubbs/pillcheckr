import React from 'react';
import { View, StyleSheet } from 'react-native';

interface ColorBoxProps {
    color: string;
}

const ColorBox: React.FC<ColorBoxProps> = ({ color }) => {
    console.log(color);
    return (

        <View style={[styles.colorBox, { backgroundColor: color }]} />
    );
};

const styles = StyleSheet.create({
    colorBox: {
        width: 8,
        height: 8,
    },
});

export default ColorBox;
