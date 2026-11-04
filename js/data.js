// [name, muscle, equipment, difficulty, sets, reps, rest]
const raw = [
['Push Up','Chest','Bodyweight','Beginner',3,12,60],['Incline Push Up','Chest','Bodyweight','Beginner',3,12,60],['Dumbbell Bench Press','Chest','Dumbbells','Intermediate',3,10,90],
['Barbell Bench Press','Chest','Barbell','Intermediate',4,8,120],['Dumbbell Row','Back','Dumbbells','Beginner',3,10,90],['Pull Up','Back','Pull-up Bar','Advanced',3,6,120],
['Band Pull Apart','Back','Resistance Bands','Beginner',3,15,45],['Barbell Row','Back','Barbell','Intermediate',4,8,120],['Dumbbell Shoulder Press','Shoulders','Dumbbells','Beginner',3,10,90],
['Pike Push Up','Shoulders','Bodyweight','Intermediate',3,8,75],['Lateral Raise','Shoulders','Dumbbells','Beginner',3,15,45],['Dumbbell Curl','Arms','Dumbbells','Beginner',3,12,60],
['Tricep Dip','Arms','Bodyweight','Intermediate',3,10,60],['Overhead Tricep Extension','Arms','Dumbbells','Beginner',3,12,60],['Bodyweight Squat','Legs','Bodyweight','Beginner',3,15,60],
['Goblet Squat','Legs','Kettlebell','Beginner',3,12,75],['Barbell Back Squat','Legs','Barbell','Intermediate',4,6,150],['Walking Lunge','Legs','Bodyweight','Beginner',3,12,60],
['Romanian Deadlift','Legs','Dumbbells','Intermediate',3,10,90],['Glute Bridge','Legs','Bodyweight','Beginner',3,15,45],['Bulgarian Split Squat','Legs','Dumbbells','Advanced',3,8,90],
['Calf Raise','Legs','Bodyweight','Beginner',3,20,45],['Plank','Core','Bodyweight','Beginner',3,40,45],['Dead Bug','Core','Bodyweight','Beginner',3,10,45],['Hanging Knee Raise','Core','Pull-up Bar','Intermediate',3,10,60],
['Bicycle Crunch','Core','Bodyweight','Beginner',3,20,45],['Kettlebell Swing','Legs','Kettlebell','Intermediate',4,15,60],['Burpee','Cardio','Bodyweight','Intermediate',3,10,60],
['Mountain Climber','Cardio','Bodyweight','Beginner',3,30,45],['Jump Rope','Cardio','Bodyweight','Beginner',3,60,45],['Cat-Cow Stretch','Mobility','Bodyweight','Beginner',2,10,30],['Hip Flexor Stretch','Mobility','Bodyweight','Beginner',2,30,30]];
export const EXERCISES = raw.map((r, i) => ({ id: i + 1, name: r[0], muscle: r[1], equipment: r[2], difficulty: r[3], sets: r[4], reps: r[5], rest: r[6] }));
export const GOALS = ['Build Muscle','Lose Fat','Build Strength','Improve Fitness','Improve Mobility'];
export const LEVELS = ['Beginner','Intermediate','Advanced'];
export const EQUIPMENT = ['Bodyweight','Dumbbells','Barbell','Resistance Bands','Pull-up Bar','Kettlebell','Full Gym'];
export const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
