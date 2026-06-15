import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { getUserUuid } from '../utils/tokenStorage';
import { chatApi } from '../api/client';

const C = {
  white:   '#FFFFFF',
  black:   '#111111',
  yellow:  '#FFC400',
  gray:    '#757575',
  grayBg:  '#F0F0F0',
  border:  '#EEEEEE',
  bg:      '#F8F8F8',
};

const SHADOW = {
  shadowColor:   '#000',
  shadowOffset:  { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius:  4,
  elevation:     2,
};

const formatTime = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
};

export default function ChatScreen({ params = {}, goBack, onClose }) {
  const { serviceDbId = '' } = params;
  const handleClose = onClose || goBack || (() => {});
  const uuidRef     = useRef('');

  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto]       = useState('');
  const [sending, setSending]   = useState(false);
  const listRef                 = useRef(null);

  const fetchMensajes = async () => {
    if (!serviceDbId) return;
    try {
      const { data } = await chatApi.getMensajes(serviceDbId, uuidRef.current);
      if (Array.isArray(data?.mensajes)) setMensajes(data.mensajes);
    } catch {}
  };

  useEffect(() => {
    let interval;
    getUserUuid().then((uuid) => {
      if (uuid) uuidRef.current = uuid;
      if (serviceDbId) {
        fetchMensajes();
        interval = setInterval(fetchMensajes, 3000);
      }
    });
    return () => clearInterval(interval);
  }, [serviceDbId]);

  const handleEnviar = async () => {
    const msg = texto.trim();
    if (!msg || sending) return;
    setSending(true);
    setTexto('');
    try {
      await chatApi.enviarMensaje(serviceDbId, {
        sender_id:   uuidRef.current,
        sender_tipo: 'cliente',
        mensaje:     msg,
      });
      await fetchMensajes();
    } catch {} finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }) => {
    const esCliente = item.sender_tipo === 'cliente';
    return (
      <View style={esCliente ? s.rowRight : s.rowLeft}>
        <View style={esCliente ? s.bubbleCliente : s.bubbleConductor}>
          <Text style={esCliente ? s.msgCliente : s.msgConductor}>
            {item.mensaje}
          </Text>
        </View>
        <Text style={esCliente ? s.timeRight : s.timeLeft}>
          {formatTime(item.created_at)}
        </Text>
      </View>
    );
  };

  return (
    <View style={s.root}>
      <StatusBar backgroundColor={C.white} barStyle="dark-content" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Chat con conductor</Text>
        <TouchableOpacity style={s.closeBtn} onPress={handleClose} activeOpacity={0.7}>
          <Text style={s.closeTxt}>✕</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={listRef}
          data={mensajes}
          keyExtractor={(item, i) => item.id?.toString() || String(i)}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>💬</Text>
              <Text style={s.emptyTxt}>Inicia la conversación</Text>
            </View>
          }
        />

        {/* Input */}
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={C.gray}
            value={texto}
            onChangeText={setTexto}
            multiline
            maxLength={500}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={sending ? s.sendBtnDis : s.sendBtn}
            onPress={handleEnviar}
            activeOpacity={0.85}
            disabled={sending}
          >
            <Text style={s.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.white },
  flex: { flex: 1 },

  /* Header */
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 20,
    paddingTop:        52,
    paddingBottom:     16,
    backgroundColor:   C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title:    { color: C.black, fontSize: 18, fontWeight: '800' },
  closeBtn: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: C.bg,
    alignItems:      'center',
    justifyContent:  'center',
  },
  closeTxt: { color: C.black, fontSize: 16, fontWeight: '700' },

  /* Message list */
  listContent: { paddingHorizontal: 16, paddingVertical: 16 },

  rowRight: { alignItems: 'flex-end', marginBottom: 12 },
  rowLeft:  { alignItems: 'flex-start', marginBottom: 12 },

  bubbleCliente: {
    backgroundColor:       C.yellow,
    borderRadius:          18,
    borderBottomRightRadius: 4,
    paddingHorizontal:     14,
    paddingVertical:       10,
    maxWidth:              '75%',
    ...SHADOW,
  },
  bubbleConductor: {
    backgroundColor:      C.grayBg,
    borderRadius:         18,
    borderBottomLeftRadius: 4,
    paddingHorizontal:    14,
    paddingVertical:      10,
    maxWidth:             '75%',
  },
  msgCliente:   { color: C.black, fontSize: 15, fontWeight: '500', lineHeight: 20 },
  msgConductor: { color: C.black, fontSize: 15, lineHeight: 20 },

  timeRight: { color: C.gray, fontSize: 10, marginTop: 3, marginRight: 2 },
  timeLeft:  { color: C.gray, fontSize: 10, marginTop: 3, marginLeft: 2 },

  /* Empty state */
  emptyWrap: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTxt:  { color: C.gray, fontSize: 14 },

  /* Input row */
  inputRow: {
    flexDirection:     'row',
    alignItems:        'flex-end',
    paddingHorizontal: 12,
    paddingVertical:   10,
    paddingBottom:     28,
    borderTopWidth:    1,
    borderTopColor:    C.border,
    backgroundColor:   C.white,
    gap:               8,
  },
  input: {
    flex:              1,
    backgroundColor:   C.bg,
    borderRadius:      20,
    paddingHorizontal: 16,
    paddingVertical:   10,
    fontSize:          15,
    color:             C.black,
    maxHeight:         100,
  },
  sendBtn: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: C.yellow,
    alignItems:      'center',
    justifyContent:  'center',
  },
  sendBtnDis: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: C.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
  sendIcon: { color: C.black, fontSize: 18, fontWeight: '700' },
});
