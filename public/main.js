var OwnersDisplay = (function(){
	var owners = [];
	return {
		oninit: function(){
			m.request({
				method: 'GET',
				url: './owners'
			}).then(function(response){
				owners = response.body;
			});
		},
		view: function(){
			return [
				m('ul', [
					owners.map(function(owner){
						return m('li', owner.email);
					})
				])
			]
		}
	}
})();

document.addEventListener('DOMContentLoaded', function(){
	m.mount(document.getElementById('display'), OwnersDisplay);
});
