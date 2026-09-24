import React,{useEffect,useMemo,useState}from'react';
import * as Location from 'expo-location';
import{Alert,Modal,Platform,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,TextInput,View}from'react-native';
import{StatusBar}from'expo-status-bar';
import*as Notifications from'expo-notifications';

import{
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
}from'firebase/firestore';

import { db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import {
  getProfile,
  login,
  logout,
  mySeniors,
  pairSenior,
  register,
  relinquishSenior
} from './auth-service';

Notifications.setNotificationHandler({
  handleNotification:async()=>({
    shouldShowBanner:true,
    shouldShowList:true,
    shouldPlaySound:true,
    shouldSetBadge:false
  })
});

const seniorId='senior-rohan',
caregiverId='caregiver-demo',
days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// Set this to your laptop's Wi-Fi IPv4 address before opening the app on the phone.
const SEARCH_API_URL='http://10.10.52.246:3001';


const getTodayKey=()=>{
  const d=new Date();

  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

async function alarm(r){
  if(Platform.OS==='android')
    await Notifications.setNotificationChannelAsync('medicine',{
      name:'Medicine reminders',
      importance:Notifications.AndroidImportance.MAX,
      sound:'default',
      vibrationPattern:[0,300,200,300]
    });

  let p=await Notifications.requestPermissionsAsync();

  if(p.status!=='granted')
    throw new Error('Notifications are not allowed');

  let m=String(r.time||'').trim().match(/^(\d{1,2})\s*[:.]\s*(\d{2})\s*(AM|PM)?$/i);

  if(!m)
    throw new Error('Use time like 07:05 AM or 19:05');

  let h=+m[1],
      min=+m[2],
      ampm=m[3]?.toUpperCase();

  if(min>59||h>23||h<0)
    throw new Error('Invalid medicine time');

  if(ampm){
    if(h<1||h>12)
      throw new Error('Invalid medicine time');

    h=h%12+(ampm==='PM'?12:0);
  }

  let now=new Date(),
      today=(now.getDay()+6)%7,
      activeDays=Array.isArray(r.days)&&r.days.length?r.days:days;

  for(let i=0;i<28;i++){
    let day=days[(today+i)%7];

    if(!activeDays.includes(day))
      continue;

    let date=new Date(now);
    date.setDate(now.getDate()+i);
    date.setHours(h,min,0,0);

    let seconds=Math.floor((date.getTime()-Date.now())/1000);

    if(seconds<1)
      continue;

    await Notifications.scheduleNotificationAsync({
      content:{
        title:'Medicine reminder',
        body:`${r.name} — ${r.dosage}. ${r.food}.`,
        sound:'default',
        data:{routineId:r.id}
      },
      trigger:{
        type:Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats:false,
        channelId:'medicine'
      }
    });
  }
}

async function syncSeniorAlarms(rows){
  try{
    let queued=await Notifications.getAllScheduledNotificationsAsync();
    let ids=new Set(rows.map(r=>r.id));

    await Promise.all(
      queued
        .filter(x=>ids.has(x.content.data?.routineId))
        .map(x=>Notifications.cancelScheduledNotificationAsync(x.identifier))
    );

    for(const r of rows)
      await alarm(r);

  }catch(e){
    console.log('Senior alarm sync failed',e);
  }
}

async function clearAlarms(){
  await Notifications.cancelAllScheduledNotificationsAsync();
  Alert.alert(
    'Cleared',
    'All old queued alarms were removed. Create the medicine routine again.'
  );
}

async function testAlarm(){
  if(Platform.OS==='android')
    await Notifications.setNotificationChannelAsync('medicine',{
      name:'Medicine reminders',
      importance:Notifications.AndroidImportance.MAX,
      sound:'default',
      vibrationPattern:[0,500,250,500]
    });

  let p=await Notifications.requestPermissionsAsync();

  if(p.status!=='granted')
    return Alert.alert(
      'Notifications blocked',
      'Allow SafeAGE notifications in Android settings.'
    );

  await Notifications.scheduleNotificationAsync({
    content:{
      title:'SafeAGE alarm test',
      body:'If you hear this, medicine alarms are working.',
      sound:'default'
    },
    trigger:{
      type:Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds:5,
      repeats:false
    }
  });

  Alert.alert(
    'Test scheduled',
    'Lock the phone. Alarm will sound in 5 seconds.'
  );
}

export default function App(){

  const[user,setUser]=useState(null),
      [profile,setProfile]=useState(null),
      [rows,setRows]=useState([]),
      [add,setAdd]=useState(false),
      [selected,setSelected]=useState(null),
      [moodDone,setMoodDone]=useState(false),
      [moodOpen,setMoodOpen]=useState(false),
      [selectedMood,setSelectedMood]=useState('');

  // TEST LOCATION
  const testLocation = async () => {

    const { status } =
      await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Location Permission',
        'Location permission was denied.'
      );
      return;
    }

    const location =
      await Location.getCurrentPositionAsync({});

    Alert.alert(
      'Location Found',
      `Latitude: ${location.coords.latitude}\nLongitude: ${location.coords.longitude}`
    );
  };

  // REAL SOS TRIGGER
  const triggerSOS = async () => {

    try {

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Location permission is required for SOS.'
        );
        return;
      }

      const location =
        await Location.getCurrentPositionAsync({});

      // Find all caregivers linked to this senior
      const linkSnap = await getDocs(
        query(
          collection(db,'caregiverLinks'),
          where('seniorId','==',profile.uid)
        )
      );

      const caregiverIds = linkSnap.docs
        .map(d=>d.data().caregiverId)
        .filter(Boolean);

      if(!caregiverIds.length){
        Alert.alert(
          'SOS failed',
          'No caregiver is linked to this senior.'
        );
        return;
      }

      // Create SOS alert
      await addDoc(collection(db,'sosAlerts'),{

        seniorId:profile.uid,

        caregiverIds:caregiverIds,

        // Keeps track of which caregivers already received this SOS
        notifiedCaregiverIds:[],

        latitude:location.coords.latitude,

        longitude:location.coords.longitude,

        createdAt:serverTimestamp(),

        status:'active'
      });

      Alert.alert(
        'SOS Sent 🚨',
        'Your caregiver has been alerted.'
      );

    }catch(e){

      Alert.alert(
        'SOS failed',
        e.message
      );

    }
  };

  // AUTH LISTENER
  useEffect(()=>{

    return onAuthStateChanged(
      auth,
      async u=>{
        setUser(u);
        setProfile(
          u ? await getProfile(u.uid) : null
        );
      }
    );

  },[]);

  // CAREGIVER SOS LISTENER
  useEffect(()=>{

    if(!profile || profile.role!=='caregiver')
      return;

    return onSnapshot(
      query(
        collection(db,'sosAlerts'),
        orderBy('createdAt','desc')
      ),

      async snapshot=>{

        const alerts=snapshot.docs
          .map(d=>({
            id:d.id,
            ...d.data()
          }))
          .filter(x=>
            x.caregiverIds?.includes(user.uid) &&
            x.status==='active' &&
            !x.notifiedCaregiverIds?.includes(user.uid)
          );

        for(const alert of alerts){

          // Mark this caregiver as notified FIRST
          await updateDoc(
            doc(db,'sosAlerts',alert.id),
            {
              notifiedCaregiverIds:
                arrayUnion(user.uid)
            }
          );

          // Phone notification
          await Notifications.scheduleNotificationAsync({

            content:{
              title:'🚨 EMERGENCY SOS',

              body:
                `Your senior triggered SOS.\n`+
                `Location: ${alert.latitude}, ${alert.longitude}`,

              sound:'default',

              data:{
                sosId:alert.id,
                latitude:alert.latitude,
                longitude:alert.longitude
              }
            },

            trigger:null
          });

          // In-app emergency popup
          Alert.alert(
            '🚨 EMERGENCY SOS',

            `Your senior has triggered an SOS.\n\n`+
            `Location:\n`+
            `${alert.latitude}, ${alert.longitude}`
          );
        }
      }
    );

  },[profile,user]);

  // MEDICINE LISTENER
  useEffect(()=>{

    if(!profile)
      return;

    let sid=
      profile.role==='senior'
        ? user.uid
        : selected?.seniorId;

    if(!sid)
      return;

    return onSnapshot(
      query(
        collection(db,'medicineRoutines'),
        orderBy('createdAt','desc')
      ),

      x=>
        setRows(
          x.docs
            .map(d=>({
              id:d.id,
              ...d.data()
            }))
            .filter(
              r=>
                r.seniorId===sid &&
                r.status==='active'
            )
        )
    );

  },[profile,selected]);

// DAILY MOOD CHECK
useEffect(()=>{

  if(!profile || profile.role!=='senior' || !user)
    return;

  const checkMood=async()=>{

    const dateKey=getTodayKey();

    const moodRef=doc(
      db,
      'moodChecks',
      `${user.uid}_${dateKey}`
    );

    const snap=await getDoc(moodRef);

    setMoodDone(snap.exists());
  };

  checkMood();

},[profile,user]);
  
  // SENIOR MEDICINE ALARMS
  useEffect(()=>{

    if(
      profile?.role==='senior' &&
      rows.length
    )
      syncSeniorAlarms(rows);

  },[profile,rows]);

  if(!user||!profile)
    return <Auth/>;

  let sid=
    profile.role==='senior'
      ? user.uid
      : selected?.seniorId;

  let take=id=>
    updateDoc(
      doc(db,'medicineRoutines',id),
      {
        todayStatus:'taken',
        updatedAt:serverTimestamp()
      }
    );
let saveMood=async mood=>{

  if(!mood)
    return Alert.alert(
      'Select a mood',
      'Please choose how you are feeling today.'
    );

  const dateKey=getTodayKey();

  const moodRef=doc(
    db,
    'moodChecks',
    `${user.uid}_${dateKey}`
  );

  const existing=await getDoc(moodRef);

  if(existing.exists()){

    setMoodDone(true);
    setMoodOpen(false);
    setSelectedMood('');

    return Alert.alert(
      'Already completed',
      'You have already completed today\'s mood check.'
    );
  }

  await setDoc(
    moodRef,
    {
      seniorId:user.uid,
      mood,
      dateKey,
      createdAt:serverTimestamp()
    }
  );

  setMoodDone(true);
  setMoodOpen(false);
  setSelectedMood('');

  Alert.alert(
    'Mood Saved ❤️',
    'Your mood check is completed for today.'
  );
};

  let save=async r=>{

    if(!sid)
      return Alert.alert(
        'Select a senior',
        'Pair/select a senior first.'
      );

    let ref=await addDoc(
      collection(db,'medicineRoutines'),
      {
        ...r,
        seniorId:sid,
        caregiverId:user.uid,
        status:'active',
        todayStatus:'upcoming',

        verification:{
          doubleConfirmed:true,
          matchStatus:'caregiver-double-confirmed'
        },

        createdAt:serverTimestamp(),
        updatedAt:serverTimestamp()
      }
    );

    await alarm({
      ...r,
      id:ref.id
    });

    setAdd(false);
  };

  return(
    <SafeAreaView style={s.app}>

      <StatusBar style="dark"/>

      <View style={s.head}>

        <Text style={s.brand}>
          {profile.name}
        </Text>

        <Pressable onPress={logout}>
          <Text style={s.link}>
            Logout
          </Text>
        </Pressable>

      </View>

      {
        profile.role==='caregiver'
          ?
          <CareGate
            uid={user.uid}
            selected={selected}
            setSelected={setSelected}
            rows={rows}
            add={()=>setAdd(true)}
          />
          :
    <Senior
  rows={rows}
  take={take}
  testLocation={testLocation}
  triggerSOS={triggerSOS}
  moodDone={moodDone}
  openMood={()=>setMoodOpen(true)}
/>
      }

      <Form
        open={add}
        close={()=>setAdd(false)}
        save={save}
      />
      <MoodModal
  open={moodOpen}
  close={()=>{
    setMoodOpen(false);
    setSelectedMood('');
  }}
  selected={selectedMood}
  setSelected={setSelectedMood}
  save={saveMood}
/>

    </SafeAreaView>
  );
}

function Auth(){

  const[signup,setSignup]=useState(false),
        [name,setName]=useState(''),
        [email,setEmail]=useState(''),
        [password,setPassword]=useState(''),
        [role,setRole]=useState('caregiver');

  let go=async()=>{

    try{

      signup
        ? await register({
            name,
            email,
            password,
            role
          })
        : await login(
            email,
            password
          );

    }catch(e){

      Alert.alert(
        'Authentication failed',
        e.message
      );

    }
  };

  return(
    <SafeAreaView style={s.login}>

      <Text style={s.title}>
        SafeAGE
      </Text>

      <Text style={s.sub}>
        {signup?'Create account':'Login'}
      </Text>

      {
        signup &&
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="Full name"
        />
      }

      <TextInput
        style={s.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
      />

      <TextInput
        style={s.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password (6+ characters)"
        secureTextEntry
      />

      {
        signup &&
        <View style={s.row}>

          {
            ['caregiver','senior'].map(x=>
              <Pressable
                key={x}
                style={[
                  s.chip,
                  role===x&&s.sel
                ]}
                onPress={()=>setRole(x)}
              >
                <Text>{x}</Text>
              </Pressable>
            )
          }

        </View>
      }

      <Btn
        t={signup?'Create account':'Login'}
        f={go}
      />

      <Btn
        t={
          signup
            ? 'Already have an account? Login'
            : 'New user? Create account'
        }
        f={()=>setSignup(!signup)}
        light
      />

    </SafeAreaView>
  );
}

function CareGate({
  uid,
  selected,
  setSelected,
  rows,
  add
}){

  const[links,setLinks]=useState([]),
        [code,setCode]=useState('');

  useEffect(()=>{

    mySeniors(uid)
      .then(setLinks);

  },[uid,selected]);

  let pair=async()=>{

    try{

      await pairSenior(uid,code);

      setCode('');

      setLinks(
        await mySeniors(uid)
      );

    }catch(e){

      Alert.alert(
        'Pairing failed',
        e.message
      );

    }
  };

  if(!selected)

    return(
      <ScrollView contentContainerStyle={s.pad}>

        <Text style={s.h}>
          My seniors
        </Text>

        <TextInput
          style={s.input}
          value={code}
          onChangeText={setCode}
          placeholder="Enter Senior ID e.g. SAFE-ABC123"
        />

        <Btn
          t="Pair senior"
          f={pair}
        />

        {
          links.map(x=>
            <View
              key={x.linkId}
              style={s.card}
            >

              <Text style={s.med}>
                {x.seniorName}
              </Text>

              <Text>
                {x.seniorCode}
              </Text>

              <Btn
                t="Manage this senior"
                f={()=>setSelected(x)}
              />

              <Btn
                t="Relinquish senior"
                f={async()=>{
                  await relinquishSenior(x.linkId);
                  setLinks(
                    await mySeniors(uid)
                  );
                }}
                light
              />

            </View>
          )
        }

      </ScrollView>
    );

  return(
    <ScrollView contentContainerStyle={s.pad}>

      <Text style={s.h}>
        {selected.seniorName}
      </Text>

      <Btn
        t="Switch senior"
        f={()=>setSelected(null)}
        light
      />

      <Care
        rows={rows}
        add={add}
      />

    </ScrollView>
  );
}

function Btn({t,f,light}){

  return(
    <Pressable
      style={light?s.light:s.btn}
      onPress={f}
    >
      <Text
        style={
          light
            ? s.link
            : s.white
        }
      >
        {t}
      </Text>
    </Pressable>
  );
}

function Care({rows,add}){

  let n=
    rows.filter(
      x=>x.todayStatus==='taken'
    ).length;

  let clear=async()=>{

    if(!rows.length)
      return;

    await Promise.all(
      rows.map(
        r=>
          deleteDoc(
            doc(
              db,
              'medicineRoutines',
              r.id
            )
          )
      )
    );

    await clearAlarms();

    Alert.alert(
      'Cleared',
      'All routines for the selected senior were removed.'
    );
  };

  return(
    <ScrollView contentContainerStyle={s.pad}>

      <Text style={s.h}>
        Medicine routines
      </Text>

      <Text style={s.sub}>
        Caregiver creates and verifies every routine.
      </Text>

      <View style={s.metric}>

        <Text style={s.num}>
          {
            rows.length
              ? Math.round(n/rows.length*100)
              : 0
          }%
        </Text>

        <Text>
          Today confirmed
        </Text>

      </View>

      <Btn
        t="+ Add medicine to routine"
        f={add}
      />

      <Btn
        t="Test alarm in 5 seconds"
        f={testAlarm}
        light
      />

      <Btn
        t="Clear existing routines"
        f={clear}
        light
      />

      <Text style={s.label}>
        ACTIVE ROUTINES
      </Text>

      {
        rows.map(r=>
          <Card
            key={r.id}
            r={r}
            care
          />
        )
      }

      {
        !rows.length &&
        <Text style={s.sub}>
          No routines created yet.
        </Text>
      }

    </ScrollView>
  );
}

function Senior({
  rows,
  take,
  testLocation,
  triggerSOS,
  moodDone,
  openMood
}){

  return(
    <ScrollView contentContainerStyle={s.pad}>

      <Text style={s.h}>
        Today’s medicines
      </Text>

      <Text style={s.sub}>
        Only your caregiver can edit routines.
      </Text>

      {
        rows.map(r=>
          <Card
            key={r.id}
            r={r}
            take={take}
          />
        )
      }

      <Pressable
        disabled={moodDone}
        onPress={openMood}
        style={[
          s.moodButton,
          moodDone&&s.moodButtonDone
        ]}
      >
        <Text style={s.moodButtonText}>
          {
            moodDone
              ? '✅ Mood Check Completed for today'
              : '🧠 Take Today\'s Mood Test'
          }
        </Text>
      </Pressable>

      <Pressable
        onPress={triggerSOS}
        style={s.btn}
      >
        <Text style={s.white}>
          🚨 SEND SOS
        </Text>
      </Pressable>

    </ScrollView>
  );
}

function Card({r,care,take}){

  let done=
    r.todayStatus==='taken';

  return(
    <View
      style={[
        s.card,
        done&&s.done
      ]}
    >

      <Text style={s.time}>
        {r.time}
      </Text>

      <Text style={s.med}>
        {r.name}
      </Text>

      <Text style={s.sub}>
        {r.strength}
      </Text>

      <Text style={s.sub}>
        {r.dosage} · {r.food}
      </Text>

      <Text style={s.sub}>
        {r.days?.join(', ')}
      </Text>

      {
        care
          ?
          <Text style={s.state}>
            {
              done
                ? 'Taken ✓'
                : 'Awaiting confirmation'
            }
          </Text>

          :

          done
            ?
            <Text style={s.state}>
              Taken ✓
            </Text>
            :
            <Btn
              t="Mark as taken"
              f={()=>take(r.id)}
            />
      }

    </View>
  );
}
function MoodModal({
  open,
  close,
  selected,
  setSelected,
  save
}){

  const moods=[
    {emoji:'😊',name:'Very Good'},
    {emoji:'🙂',name:'Good'},
    {emoji:'😐',name:'Okay'},
    {emoji:'😔',name:'Sad'},
    {emoji:'😟',name:'Worried'}
  ];

  return(
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={close}
    >

      <View style={s.modalBackdrop}>

        <View style={s.moodModal}>

          <Text style={s.h}>
            🧠 Daily Mood Check
          </Text>

          <Text style={s.sub}>
            How are you feeling today?
          </Text>

          {
            moods.map(x=>
              <Pressable
                key={x.name}
                onPress={()=>setSelected(x.name)}
                style={[
                  s.moodOption,
                  selected===x.name&&s.moodOptionSelected
                ]}
              >

                <Text style={s.moodEmoji}>
                  {x.emoji}
                </Text>

                <Text style={s.moodName}>
                  {x.name}
                </Text>

              </Pressable>
            )
          }

          <Btn
            t="Save Mood"
            f={()=>save(selected)}
          />

          <Btn
            t="Cancel"
            f={close}
            light
          />

        </View>

      </View>

    </Modal>
  );
}


function Form({
  open,
  close,
  save
}){

  const[q,setQ]=useState(''),
        [results,setResults]=useState([]),
        [med,setMed]=useState(null),
        [dose,setDose]=useState(''),
        [time,setTime]=useState(''),
        [food,setFood]=useState('After food'),
        [check,setCheck]=useState(false),
        [again,setAgain]=useState(false);

  useEffect(()=>{

    if(q.length<2)
      return setResults([]);

    let t=setTimeout(()=>
      fetch(
        `${SEARCH_API_URL}/search?q=${encodeURIComponent(q)}`
      )
      .then(x=>x.ok?x.json():[])
      .then(setResults)
      .catch(()=>setResults([])),
      250
    );

    return()=>clearTimeout(t);

  },[q]);

  let submit=()=>{

    if(!med||!dose||!time)
      return Alert.alert(
        'Missing',
        'Select medicine and enter dosage/time from prescription.'
      );

    if(!check)
      return Alert.alert(
        'Verify first',
        'Check the prescription verification box.'
      );

    if(!again)
      return setAgain(true);

    save({
      medicineId:med.id,
      name:med.name,
      strength:med.strength,
      dosage:dose,
      time,
      food,
      days
    });
  };

  return(
    <Modal
      visible={open}
      animationType="slide"
    >

      <SafeAreaView style={s.app}>

        <ScrollView contentContainerStyle={s.pad}>

          <Text style={s.h}>
            Add routine
          </Text>

          <Text style={s.label}>
            Search all medicine records
          </Text>

          <TextInput
            style={s.input}
            value={q}
            onChangeText={x=>{
              setQ(x);
              setMed(null);
            }}
            placeholder="Type e.g. para"
          />

          {
            q.length>1 &&
            !results.length &&
            <Text style={s.sub}>
              No result, or start medicine search server.
            </Text>
          }

          {
            results.map(x=>
              <Pressable
                key={x.id}
                style={s.result}
                onPress={()=>{
                  setMed(x);
                  setQ(x.name);
                }}
              >

                <Text style={s.med}>
                  {x.name}
                </Text>

                <Text style={s.sub}>
                  {x.strength}
                </Text>

              </Pressable>
            )
          }

          <Text style={s.label}>
            Copy from prescription
          </Text>

          <TextInput
            style={s.input}
            value={dose}
            onChangeText={setDose}
            placeholder="Dosage e.g. 1 tablet / 5 mL"
          />

          <TextInput
            style={s.input}
            value={time}
            onChangeText={setTime}
            placeholder="Time e.g. 08:00 AM"
          />

          <View style={s.row}>

            {
              [
                'Before food',
                'After food',
                'No instruction'
              ].map(x=>
                <Pressable
                  key={x}
                  style={[
                    s.chip,
                    food===x&&s.sel
                  ]}
                  onPress={()=>setFood(x)}
                >
                  <Text>{x}</Text>
                </Pressable>
              )
            }

          </View>

          <Pressable
            style={s.check}
            onPress={()=>setCheck(!check)}
          >
            <Text>
              {
                check
                  ? '☑'
                  : '☐'
              }
              {' '}
              I verified medicine, strength, dosage and timing against the prescription.
            </Text>
          </Pressable>

          <View style={s.review}>

            <Text style={s.med}>
              Review
            </Text>

            <Text>
              {med?.name||'Medicine missing'}
              {`\n`}
              {med?.strength||''}
              {`\n`}
              {dose||'Dosage missing'}
              {' · '}
              {time||'Time missing'}
              {' · '}
              {food}
            </Text>

          </View>

          <Btn
            t={
              again
                ? 'Confirm & create routine'
                : 'Verify details again'
            }
            f={submit}
          />

          <Btn
            t="Cancel"
            f={close}
            light
          />

        </ScrollView>

      </SafeAreaView>

    </Modal>
  );
}

const s=StyleSheet.create({

  app:{
    flex:1,
    backgroundColor:'#F6F9FE'
  },

  login:{
    flex:1,
    justifyContent:'center',
    padding:28,
    backgroundColor:'#F6F9FE'
  },

  head:{
    backgroundColor:'#fff',
    padding:18,
    flexDirection:'row',
    justifyContent:'space-between'
  },

  brand:{
    fontSize:23,
    fontWeight:'800',
    color:'#12355E'
  },

  title:{
    fontSize:42,
    fontWeight:'800',
    color:'#12355E'
  },

  h:{
    fontSize:27,
    fontWeight:'800',
    color:'#12355E'
  },

  sub:{
    fontSize:15,
    lineHeight:21,
    color:'#5D7087',
    marginTop:5
  },

  pad:{
    padding:20,
    paddingBottom:40
  },

  btn:{
    backgroundColor:'#105CC5',
    padding:16,
    borderRadius:12,
    alignItems:'center',
    marginTop:14
  },
  moodButton:{
  backgroundColor:'#E8F1FF',
  borderWidth:1,
  borderColor:'#9BBCE8',
  padding:16,
  borderRadius:12,
  alignItems:'center',
  marginTop:18
},

moodButtonDone:{
  backgroundColor:'#EAF7EE',
  borderColor:'#9AD1A8'
},

moodButtonText:{
  fontSize:16,
  fontWeight:'800',
  color:'#12355E'
},

modalBackdrop:{
  flex:1,
  backgroundColor:'rgba(0,0,0,0.45)',
  justifyContent:'center',
  padding:20
},

moodModal:{
  backgroundColor:'#fff',
  borderRadius:18,
  padding:22
},

moodOption:{
  flexDirection:'row',
  alignItems:'center',
  backgroundColor:'#F4F7FB',
  padding:15,
  borderRadius:12,
  marginTop:10,
  borderWidth:1,
  borderColor:'#E0E8F2'
},

moodOptionSelected:{
  backgroundColor:'#DCEBFF',
  borderColor:'#105CC5'
},

moodEmoji:{
  fontSize:28,
  marginRight:14
},

moodName:{
  fontSize:17,
  fontWeight:'700',
  color:'#153B67'
},

  light:{
    borderWidth:1,
    borderColor:'#105CC5',
    padding:14,
    borderRadius:12,
    alignItems:'center',
    marginTop:12
  },

  white:{
    color:'#fff',
    fontWeight:'800',
    fontSize:16
  },

  link:{
    color:'#105CC5',
    fontWeight:'800',
    fontSize:16
  },

  note:{
    textAlign:'center',
    color:'#65768B',
    marginTop:24,
    lineHeight:20
  },

  metric:{
    backgroundColor:'#E5F0FF',
    padding:16,
    borderRadius:13,
    marginTop:18
  },

  num:{
    fontSize:31,
    fontWeight:'800',
    color:'#0A4A9E'
  },

  label:{
    marginTop:21,
    marginBottom:8,
    fontWeight:'800',
    color:'#26496D'
  },

  card:{
    backgroundColor:'#fff',
    borderColor:'#D9E5F2',
    borderWidth:1,
    padding:16,
    borderRadius:14,
    marginTop:10
  },

  done:{
    backgroundColor:'#EFFAF2'
  },

  time:{
    fontSize:18,
    fontWeight:'800',
    color:'#0E59BC'
  },

  med:{
    fontSize:18,
    fontWeight:'800',
    color:'#153B67',
    marginTop:5
  },

  state:{
    fontWeight:'800',
    color:'#157346',
    marginTop:12
  },

  input:{
    backgroundColor:'#fff',
    borderWidth:1,
    borderColor:'#B6C8DD',
    padding:13,
    borderRadius:10,
    fontSize:16,
    marginBottom:10
  },

  result:{
    backgroundColor:'#fff',
    padding:12,
    borderBottomWidth:1,
    borderColor:'#DFE8F3'
  },

  row:{
    flexDirection:'row',
    flexWrap:'wrap',
    gap:8
  },

  chip:{
    backgroundColor:'#E7EEF7',
    padding:9,
    borderRadius:9
  },

  sel:{
    backgroundColor:'#CFE2FF'
  },

  warn:{
    backgroundColor:'#FFF1D9',
    color:'#784400',
    padding:12,
    borderRadius:10,
    marginTop:12,
    lineHeight:20
  },

  check:{
    backgroundColor:'#EEF4FA',
    padding:13,
    borderRadius:10,
    marginTop:14
  },

  review:{
    backgroundColor:'#FFF1D9',
    padding:13,
    borderRadius:10,
    marginTop:14
  }

});