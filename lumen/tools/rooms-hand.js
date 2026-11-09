// Hand-made rooms: the five that teach each rule, and the finale.
const rooms = {
  first: { hint: 'Push the gold lamp until its light falls on the door. Then walk in.', name: 'First Light', map: ['#######', '#@....#', '#.....#', '#..O..#', '#.....#', '#.....#', '#######'], lamps: [[1, 4, 'g', 1]] },
  red: { hint: 'Red light stops you. Things can still be pushed through it.', name: 'Red Means Stop', map: ['#########', '#@...C..#', '#.......#', '#.......#', '###.#####', '#.......#', '#...O...#', '#########'], lamps: [[3, 1, 'r', 2], [1, 6, 'g', 1]] },
  mirror: { hint: 'Mirrors bend light.', name: 'Bend It', map: ['#########', '#@......#', '#.......#', '#...\\...#', '#.......#', '#.......#', '####.O.##', '#########'], lamps: [[1, 5, 'g', 1]] },
  ice: { hint: 'Blue light is ice. You slide until something stops you.', name: 'Thin Ice', map: ['#########', '#@......#', '#.#..C..#', '#.......#', '#...O...#', '##......#', '#.......#', '#########'], lamps: [[1, 4, 'b', 1], [4, 1, 'g', 2]] },
  cancel: { hint: 'Red and blue cancel each other out.', name: 'Purple', map: ['#########', '#@......#', '#....C..#', '#.......#', '#.......#', '#.......#', '#...O...#', '#########'], lamps: [[7, 3, 'r', 3], [5, 1, 'b', 2], [1, 6, 'g', 1]] },
  finale: { hint: 'No lamps left. Wake the runes.', name: 'The Last Light', finale: true, map: ['#########', '#*.#*..\\#', '#.#####.#', '#.......#', '#...@...#', '###...###', '#*......#', '#########'], lamps: [] },
};
module.exports = rooms;
